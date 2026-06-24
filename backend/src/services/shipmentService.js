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

    // 7. Selesai (Pembayaran dipisahkan ke paymentController)
    return {
      shipmentId,
      orderId,
      status: 'PENDING',
      ongkir,
      feeLayanan: fee_layanan,
      totalBiaya: total_biaya,
      message: 'Permintaan pengiriman diterima. Silakan lanjutkan ke proses pembayaran logistik.'
    };
  }
}

module.exports = new ShipmentService();
