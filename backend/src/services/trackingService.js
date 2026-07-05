'use strict';
const Shipment = require('../models/Shipment');
const TrackingLog = require('../models/TrackingLog');
const ShipmentRoute = require('../models/ShipmentRoute');

class TrackingService {
  async getFullTrackingData(orderId) {
    const shipment = await Shipment.findByOrderId(orderId.trim());
    if (!shipment) {
      const err = new Error(`Tidak ditemukan pengiriman untuk order_id ${orderId}.`);
      err.code = 'NOT_FOUND';
      err.status = 404;
      throw err;
    }

    const riwayat = await TrackingLog.findByShipmentId(shipment.id);
    const ruteCabang = await ShipmentRoute.getByShipmentId(shipment.id);

    return {
      order_id: shipment.order_id,
      status_terkini: shipment.status,
      tipe_pengiriman: shipment.tipe_pengiriman,
      alamat_asal: shipment.alamat_asal,
      alamat_tujuan: shipment.alamat_tujuan,
      riwayat_status: riwayat,
      rute_cabang: ruteCabang
    };
  }
}

module.exports = new TrackingService();
