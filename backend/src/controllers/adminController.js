'use strict';

const Shipment    = require('../models/Shipment');
const TrackingLog = require('../models/TrackingLog');
const respond     = require('../utils/responseHelper');
const logger      = require('../utils/logger');
const axios       = require('axios');

/**
 * GET /logistikita/admin/shipments
 *
 * Mengambil semua data shipment untuk panel admin.
 * Endpoint ini sengaja tidak dilindungi otentikasi JWT penuh untuk
 * mempermudah proses testing.
 */
async function getAllShipments(req, res) {
  logger.info('[Controller] GET /admin/shipments');

  try {
    const shipments = await Shipment.getAll();
    return respond.success(res, shipments);
  } catch (err) {
    logger.error('[Controller] getAllShipments error:', err.message);
    return respond.error(res, 'INTERNAL_ERROR', 'Gagal mengambil data pengiriman.', 500);
  }
}

/**
 * PUT /logistikita/admin/shipments/:order_id/status
 *
 * Memperbarui status shipment. Endpoint khusus admin.
 */
async function updateShipmentStatus(req, res) {
  const { order_id } = req.params;
  const { status, keterangan } = req.body;

  if (!status) {
    return respond.error(res, 'VALIDATION_ERROR', 'Atribut "status" wajib diisi.', 400);
  }

  const validStatuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'FAILED'];
  if (!validStatuses.includes(status)) {
    return respond.error(res, 'VALIDATION_ERROR', 'Status tidak valid.', 400);
  }

  logger.info(`[Controller] PUT /admin/shipments/${order_id}/status -> ${status}`);

  try {
    const shipment = await Shipment.findByOrderId(order_id);
    if (!shipment) {
      return respond.error(res, 'SHIPMENT_NOT_FOUND', `Pengiriman ${order_id} tidak ditemukan.`, 404);
    }

    if (shipment.status === status) {
      return respond.success(res, { message: 'Status tidak berubah.' });
    }

    // Update status di database
    await Shipment.updateStatus(order_id, status);

    let finalKeterangan = keterangan;
    if (!finalKeterangan && status === 'SHIPPED') {
      finalKeterangan = 'Pesanan sedang dikirim';
    } else if (!finalKeterangan) {
      finalKeterangan = `Status diperbarui menjadi ${status} oleh Admin`;
    }

    // Tambah riwayat tracking baru
    await TrackingLog.insert(
      shipment.id,
      status,
      finalKeterangan
    );

    // Kiriim Webhook ke Aplikasi Asal (Marketplace/SupplierHub)
    if (shipment.source_app) {
      axios.post(`http://localhost:5500/webhook/${shipment.source_app}`, {
        order_id,
        shipment_id: shipment.id,
        status: status,
        keterangan: finalKeterangan,
        timestamp: new Date().toISOString()
      }).catch(err => {
        logger.error(`[Webhook] Gagal mengirim callback ke ${shipment.source_app} untuk order ${order_id}:`, err.message);
      });
    }

    return respond.success(res, {
      message: 'Status pengiriman berhasil diperbarui.',
      order_id,
      status_baru: status
    });
  } catch (err) {
    logger.error('[Controller] updateShipmentStatus error:', err.message);
    return respond.error(res, 'INTERNAL_ERROR', 'Gagal memperbarui status pengiriman.', 500);
  }
}

module.exports = {
  getAllShipments,
  updateShipmentStatus
};
