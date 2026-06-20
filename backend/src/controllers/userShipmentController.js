'use strict';

const shipmentService = require('../services/shipmentService');
const Shipment = require('../models/Shipment');
const respond = require('../utils/responseHelper');
const logger = require('../utils/logger');

class UserShipmentController {
  async createPengiriman(req, res) {
    try {
      const { 
        alamat_asal, lat_asal, lng_asal, 
        alamat_tujuan, lat_tujuan, lng_tujuan, 
        nilai_transaksi, tipe_pengiriman 
      } = req.body;

      if (!alamat_asal || !lat_asal || !lng_asal || !alamat_tujuan || !lat_tujuan || !lng_tujuan || !tipe_pengiriman) {
        return respond.error(res, 'VALIDATION_ERROR', 'Semua data alamat, koordinat, dan tipe pengiriman wajib diisi.', 400);
      }

      const orderId = `DIR-${Date.now()}`;
      const payload = {
        orderId,
        userId: req.user.id,
        sourceApp: 'direct',
        alamatAsal: alamat_asal,
        latAsal: parseFloat(lat_asal),
        lngAsal: parseFloat(lng_asal),
        alamatTujuan: alamat_tujuan,
        latTujuan: parseFloat(lat_tujuan),
        lngTujuan: parseFloat(lng_tujuan),
        nilaiTransaksi: nilai_transaksi ? parseInt(nilai_transaksi) : 0,
        tipePengiriman: tipe_pengiriman
      };

      const result = await shipmentService.processShipmentRequest(payload);
      
      respond.success(res, 'Pengiriman berhasil dibuat dan sedang menunggu pembayaran.', {
        shipment_id: result.shipmentId,
        order_id: result.orderId,
        payment_status: result.paymentStatus,
        transaction_id: result.transactionId,
        biaya: {
          ongkir: result.ongkir,
          fee_layanan: result.feeLayanan,
          total_biaya: result.totalBiaya
        }
      }, 201);
    } catch (err) {
      logger.error('[UserShipment] Create Error:', err.message);
      respond.error(res, 'CREATE_SHIPMENT_FAILED', err.message, err.status || 500);
    }
  }

  async getMyShipments(req, res) {
    try {
      const userId = req.user.id;
      const shipments = await Shipment.getByUserId(userId);
      respond.success(res, 'Daftar pengiriman saya', shipments);
    } catch (err) {
      logger.error('[UserShipment] Get List Error:', err.message);
      respond.error(res, 'FETCH_FAILED', 'Gagal mengambil data pengiriman.', 500);
    }
  }
}

module.exports = new UserShipmentController();
