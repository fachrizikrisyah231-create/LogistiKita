'use strict';

const Shipment    = require('../models/Shipment');
const TrackingLog = require('../models/TrackingLog');
const respond     = require('../utils/responseHelper');
const logger      = require('../utils/logger');

/**
 * GET /logistikita/tracking_status
 *
 * Mengambil status terkini dan riwayat status pengiriman.
 * Satu-satunya endpoint yang secara aktif diakses user melalui UI.
 *
 * Query param: ?order_id=ORD-...
 * Middleware: authMiddleware
 */
async function getTrackingStatus(req, res) {
  const { order_id } = req.query;
  const user_id      = req.user?.user_id;

  // ── Validasi ───────────────────────────────────────────────────
  if (!order_id || order_id.trim() === '') {
    return respond.error(res, 'VALIDATION_ERROR', "Query parameter 'order_id' wajib diisi.", 400);
  }

  logger.info(`[Controller] GET /tracking_status — order_id=${order_id}, user_id=${user_id}`);

  try {
    // Ambil shipment (sudah include validasi kepemilikan)
    const shipment = await Shipment.findByOrderId(order_id.trim());

    if (!shipment) {
      return respond.error(
        res,
        'SHIPMENT_NOT_FOUND',
        `Tidak ditemukan pengiriman untuk order_id ${order_id}.`,
        404
      );
    }

    // Validasi kepemilikan
    if (shipment.user_id !== user_id) {
      logger.warn(`[Controller] Akses ditolak: user_id=${user_id} mencoba akses shipment milik ${shipment.user_id}`);
      return respond.error(
        res,
        'FORBIDDEN',
        'Anda tidak berhak mengakses data pengiriman ini.',
        403
      );
    }

    // Ambil riwayat status
    const riwayat = await TrackingLog.findByShipmentId(shipment.id);

    return respond.success(res, {
      shipment_id:    shipment.id,
      order_id:       shipment.order_id,
      status_terkini: shipment.status,
      alamat_tujuan:  shipment.alamat_tujuan,
      nilai_transaksi: shipment.nilai_transaksi,
      ongkir:         shipment.ongkir,
      fee_layanan:    shipment.fee_layanan,
      total_biaya:    shipment.total_biaya,
      source_app:     shipment.source_app,
      transaction_id: shipment.transaction_id || null,
      estimasi_tiba:  null, // Dapat diisi di iterasi berikutnya
      riwayat_status: riwayat,
    });

  } catch (err) {
    logger.error('[Controller] getTrackingStatus error:', err.message);
    return respond.error(res, 'INTERNAL_ERROR', 'Terjadi kesalahan internal.', 500);
  }
}

module.exports = { getTrackingStatus };
