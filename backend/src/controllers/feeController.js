'use strict';

const { hitungFeeLayanan } = require('../services/costCalculatorService');
const respond = require('../utils/responseHelper');
const logger  = require('../utils/logger');

/**
 * POST /logistikita/biaya_layanan_logistik
 *
 * Menghitung fee layanan LogistiKita dari nilai ongkir.
 * Dipanggil otomatis oleh shipmentService dalam alur request_pengiriman.
 * Endpoint ini juga tersedia untuk keperluan simulasi/debug.
 *
 * Middleware: authMiddleware
 */
function hitungBiayaLayanan(req, res) {
  const { order_id, ongkir } = req.body;

  // ── Validasi ───────────────────────────────────────────────────
  if (!order_id || typeof order_id !== 'string' || order_id.trim() === '') {
    return respond.error(res, 'VALIDATION_ERROR', "Field 'order_id' wajib diisi.", 400, { fields: ['order_id'] });
  }
  if (typeof ongkir !== 'number' || ongkir <= 0) {
    return respond.error(res, 'VALIDATION_ERROR', "Field 'ongkir' harus berupa angka positif.", 400, { fields: ['ongkir'] });
  }

  logger.info(`[Controller] POST /biaya_layanan_logistik — order_id=${order_id}, ongkir=${ongkir}`);

  const result = hitungFeeLayanan(ongkir);

  return respond.success(res, result);
}

module.exports = { hitungBiayaLayanan };
