'use strict';

const shipmentService = require('../services/shipmentService');
const respond         = require('../utils/responseHelper');
const logger          = require('../utils/logger');

/**
 * POST /logistikita/request_pengiriman
 *
 * Menerima permintaan pengiriman dari Marketplace/SupplierHub.
 * Middleware: authMiddleware → rateLimitMiddleware
 */
async function requestPengiriman(req, res) {
  const {
    order_id,
    user_id,
    alamat_tujuan,
    jarak,
    nilai_transaksi,
    source_app,
  } = req.body;

  // ── Validasi Input ─────────────────────────────────────────────
  const validSourceApps = ['marketplace', 'supplierhub'];

  if (!order_id || typeof order_id !== 'string' || order_id.trim() === '') {
    return respond.error(res, 'VALIDATION_ERROR', "Field 'order_id' wajib diisi.", 400, { fields: ['order_id'] });
  }
  if (!user_id || typeof user_id !== 'string' || user_id.trim() === '') {
    return respond.error(res, 'VALIDATION_ERROR', "Field 'user_id' wajib diisi.", 400, { fields: ['user_id'] });
  }
  if (!alamat_tujuan || typeof alamat_tujuan !== 'string' || alamat_tujuan.trim() === '') {
    return respond.error(res, 'VALIDATION_ERROR', "Field 'alamat_tujuan' wajib diisi.", 400, { fields: ['alamat_tujuan'] });
  }
  if (!jarak || typeof jarak !== 'number' || jarak <= 0) {
    return respond.error(res, 'VALIDATION_ERROR', "Field 'jarak' harus berupa angka positif (km).", 400, { fields: ['jarak'] });
  }
  if (!nilai_transaksi || typeof nilai_transaksi !== 'number' || nilai_transaksi <= 0 || !Number.isInteger(nilai_transaksi)) {
    return respond.error(res, 'VALIDATION_ERROR', "Field 'nilai_transaksi' harus berupa integer positif.", 400, { fields: ['nilai_transaksi'] });
  }
  if (!source_app || !validSourceApps.includes(source_app)) {
    return respond.error(res, 'VALIDATION_ERROR', `Field 'source_app' harus salah satu dari: ${validSourceApps.join(', ')}.`, 400, { fields: ['source_app'] });
  }

  logger.info(`[Controller] POST /request_pengiriman — order_id=${order_id}, user_id=${user_id}`);

  try {
    const data = await shipmentService.processRequestPengiriman({
      order_id:        order_id.trim(),
      user_id:         user_id.trim(),
      alamat_tujuan:   alamat_tujuan.trim(),
      jarak,
      nilai_transaksi,
      source_app,
    });

    return respond.success(res, data, 201);

  } catch (err) {
    logger.error(`[Controller] request_pengiriman error: ${err.code} — ${err.message}`);

    if (err.code === 'DUPLICATE_ORDER') {
      return respond.error(res, 'DUPLICATE_ORDER', err.message, 400);
    }
    if (err.code === 'SMARTBANK_DOWN') {
      return respond.error(res, 'SMARTBANK_DOWN', err.message, 503, {
        shipment_id:     err.shipment_id,
        shipment_status: err.shipment_status,
      });
    }
    if (err.httpStatus) {
      return respond.error(res, err.code || 'PAYMENT_FAILED', err.message, err.httpStatus, {
        smartbank_error:  err.smartbank_error,
        shipment_id:      err.shipment_id,
        shipment_status:  err.shipment_status,
      });
    }

    return respond.error(res, 'INTERNAL_ERROR', 'Terjadi kesalahan internal.', 500);
  }
}

module.exports = { requestPengiriman };
