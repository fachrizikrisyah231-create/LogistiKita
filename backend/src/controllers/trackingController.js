'use strict';

const Shipment = require('../models/Shipment');
const TrackingLog = require('../models/TrackingLog');
const ShipmentRoute = require('../models/ShipmentRoute');
const respond = require('../utils/responseHelper');
const logger = require('../utils/logger');

class TrackingController {
  async getTracking(req, res) {
    const { order_id } = req.params;

    if (!order_id || order_id.trim() === '') {
      return respond.error(res, 'VALIDATION_ERROR', "Parameter 'order_id' wajib diisi.", 400);
    }

    try {
      const shipment = await Shipment.findByOrderId(order_id.trim());
      if (!shipment) {
        return respond.error(res, 'NOT_FOUND', `Tidak ditemukan pengiriman untuk order_id ${order_id}.`, 404);
      }

      const riwayat = await TrackingLog.findByShipmentId(shipment.id);
      const ruteCabang = await ShipmentRoute.getByShipmentId(shipment.id);

      return respond.success(res, 'Data tracking', {
        order_id: shipment.order_id,
        status_terkini: shipment.status,
        tipe_pengiriman: shipment.tipe_pengiriman,
        alamat_asal: shipment.alamat_asal,
        alamat_tujuan: shipment.alamat_tujuan,
        riwayat_status: riwayat,
        rute_cabang: ruteCabang
      });
    } catch (err) {
      logger.error('[Controller] getTracking error:', err.message);
      return respond.error(res, 'INTERNAL_ERROR', 'Terjadi kesalahan internal.', 500);
    }
  }
}

module.exports = new TrackingController();
