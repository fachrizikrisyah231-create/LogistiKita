'use strict';

const Shipment = require('../models/Shipment');
const TrackingLog = require('../models/TrackingLog');
const TransactionLog = require('../models/TransactionLog');
const ShipmentRoute = require('../models/ShipmentRoute');
const costCalculatorService = require('./costCalculatorService');
const smartbankService = require('./smartbankService');
const haversineService = require('./haversineService');
const routingService = require('./routingService');
const logger = require('../utils/logger');
const db = require('../config/database');

class ShipmentService {
  async processShipmentRequest(input) {
    const { 
      orderId, userId, sourceApp, tipePengiriman, 
      alamatAsal, latAsal, lngAsal, 
      alamatTujuan, latTujuan, lngTujuan, 
      nilaiTransaksi 
    } = input;

    // 1. Cek duplikasi
    const isDuplicate = await Shipment.isDuplicate(orderId);
    if (isDuplicate) {
      const err = new Error(`order_id ${orderId} sudah terdaftar.`);
      err.status = 400;
      throw err;
    }

    // 2. Hitung jarak
    const jarakKm = haversineService.calculateDistance(latAsal, lngAsal, latTujuan, lngTujuan);

    // 3. Validasi batas jarak berdasarkan tipe
    const maxSameday = parseInt(process.env.SAMEDAY_MAX_KM) || 50;
    const maxNextday = parseInt(process.env.NEXTDAY_MAX_KM) || 250;

    if (tipePengiriman === 'sameday' && jarakKm > maxSameday) {
      const err = new Error(`Jarak terlalu jauh untuk Sameday (maks ${maxSameday} km). Jarak Anda: ${jarakKm} km.`);
      err.status = 400;
      throw err;
    }
    if (tipePengiriman === 'nextday' && jarakKm > maxNextday) {
      const err = new Error(`Jarak terlalu jauh untuk Nextday (maks ${maxNextday} km). Jarak Anda: ${jarakKm} km.`);
      err.status = 400;
      throw err;
    }

    // 4. Tentukan rute cabang
    const routeInfo = await routingService.determineRoute(latAsal, lngAsal, latTujuan, lngTujuan);

    // 5. Hitung biaya
    const { ongkir, fee_layanan, total_biaya } = costCalculatorService.hitungSemuaBiaya(jarakKm, tipePengiriman);

    // 6. Buat shipment (PENDING)
    const shipmentId = await Shipment.create({
      order_id: orderId,
      user_id: userId,
      source_app: sourceApp,
      tipe_pengiriman: tipePengiriman,
      alamat_asal: alamatAsal,
      lat_asal: latAsal,
      lng_asal: lngAsal,
      alamat_tujuan: alamatTujuan,
      lat_tujuan: latTujuan,
      lng_tujuan: lngTujuan,
      jarak_km: jarakKm,
      nilai_transaksi: nilaiTransaksi,
      origin_branch_id: routeInfo.originBranch.id,
      destination_branch_id: routeInfo.destBranch.id
    });

    await Shipment.updateBiaya(orderId, { ongkir, fee_layanan, total_biaya });

    // Simpan rute
    await ShipmentRoute.createBatch(shipmentId, routeInfo.routeBranches);

    // Catat log
    await TrackingLog.insert(shipmentId, 'PENDING', 'Permintaan pengiriman diterima');

    // 7. Proses pembayaran ke SmartBank
    const paymentResult = await smartbankService.processPayment({
      shipmentId,
      orderId: orderId,
      userId: userId,
      ongkir,
      feeLay: fee_layanan,
      totalBiaya: total_biaya,
    });

    if (paymentResult.success) {
      const { transaction_id } = paymentResult.data;

      // Assign kurir (random kurir untuk simulasi)
      const [[kurir]] = await db.query('SELECT id FROM users WHERE role = "kurir" ORDER BY RAND() LIMIT 1');
      const assignedKurirId = kurir ? kurir.id : null;

      if (assignedKurirId) {
        await db.query('UPDATE shipments SET assigned_kurir_id = ? WHERE id = ?', [assignedKurirId, shipmentId]);
      }

      await Shipment.updateStatus(orderId, 'PICKUP', transaction_id);
      await TrackingLog.insert(shipmentId, 'PICKUP', 'Pembayaran ongkir berhasil, menunggu pickup');

      await TransactionLog.insertSuccess({
        shipment_id: shipmentId,
        order_id: orderId,
        user_id: userId,
        amount: total_biaya,
        ongkir,
        fee_layanan,
        transaction_id,
        smartbank_payload: paymentResult.data,
        smartbank_response: paymentResult.data,
      });

      return {
        shipmentId,
        orderId,
        paymentStatus: 'SUCCESS',
        transactionId: transaction_id,
        ongkir,
        feeLayanan: fee_layanan,
        totalBiaya: total_biaya
      };
    } else {
      const errData = paymentResult.error;
      const newStatus = errData.is_system_error ? 'PENDING' : 'FAILED';
      await Shipment.updateStatus(orderId, newStatus);
      await TrackingLog.insert(
        shipmentId,
        newStatus,
        errData.is_system_error
          ? 'Pembayaran tertunda: SmartBank down'
          : `Pembayaran gagal: ${errData.error_code}`
      );

      await TransactionLog.insertFailure({
        shipment_id: shipmentId,
        order_id: orderId,
        user_id: userId,
        amount: total_biaya,
        ongkir,
        fee_layanan,
        error_code: errData.error_code,
        error_message: errData.message,
        smartbank_payload: { orderId, shipmentId, total_biaya },
        smartbank_response: errData,
      });

      const err = new Error(errData.message || 'Pembayaran gagal');
      err.status = errData.is_system_error ? 503 : (['INSUFFICIENT_BALANCE', 'USER_NOT_FOUND'].includes(errData.error_code) ? 402 : 400);
      throw err;
    }
  }
}

module.exports = new ShipmentService();
