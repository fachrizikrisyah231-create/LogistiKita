'use strict';

const shipmentService = require('../services/shipmentService');
const respond         = require('../utils/responseHelper');
const logger          = require('../utils/logger');

class ShipmentController {
  /**
   * POST /api/request-pengiriman
   *
   * Menerima permintaan pengiriman dari Marketplace/SupplierHub.
   */
  async create(req, res) {
    const {
      order_id,
      user_id,
      source_app,
      tipe_pengiriman,
      alamat_asal,
      lat_asal,
      lng_asal,
      alamat_tujuan,
      lat_tujuan,
      lng_tujuan,
      nilai_transaksi
    } = req.body;

    // Validasi dasar
    if (!order_id || !user_id || !source_app || !tipe_pengiriman || 
        !alamat_asal || lat_asal === undefined || lng_asal === undefined ||
        !alamat_tujuan || lat_tujuan === undefined || lng_tujuan === undefined) {
      return respond.error(res, 'VALIDATION_ERROR', 'Semua field order, user, source, alamat dan koordinat wajib diisi.', 400);
    }

    const validSourceApps = ['marketplace', 'supplierhub', 'direct'];
    if (!validSourceApps.includes(source_app)) {
      return respond.error(res, 'VALIDATION_ERROR', `source_app tidak valid`, 400);
    }

    try {
      const result = await shipmentService.processShipmentRequest({
        orderId: order_id,
        userId: user_id,
        sourceApp: source_app,
        tipePengiriman: tipe_pengiriman,
        alamatAsal: alamat_asal,
        latAsal: parseFloat(lat_asal),
        lngAsal: parseFloat(lng_asal),
        alamatTujuan: alamat_tujuan,
        latTujuan: parseFloat(lat_tujuan),
        lngTujuan: parseFloat(lng_tujuan),
        nilaiTransaksi: parseInt(nilai_transaksi) || 0
      });

      return respond.success(res, 'Permintaan pengiriman berhasil diproses', result, 201);
    } catch (err) {
      logger.error(`[Controller] request_pengiriman error: ${err.message}`);
      
      const status = err.status || 500;
      return respond.error(res, err.code || 'SHIPMENT_FAILED', err.message, status);
    }
  }
}

module.exports = new ShipmentController();
