'use strict';

const Shipment       = require('../models/Shipment');
const TrackingLog    = require('../models/TrackingLog');
const TransactionLog = require('../models/TransactionLog');
const { hitungSemuaBiaya } = require('./costCalculatorService');
const smartbankService     = require('./smartbankService');
const logger               = require('../utils/logger');

/**
 * Orkestrasi alur utama request pengiriman.
 *
 * Urutan:
 *  1. Cek duplikasi order_id
 *  2. Insert shipment (PENDING)
 *  3. Hitung ongkir + fee layanan
 *  4. Update biaya ke DB
 *  5. Kirim payment ke SmartBank via Gateway
 *  6. Update status berdasarkan hasil
 *  7. Catat tracking_logs + transaction_logs
 *
 * @param {{
 *   order_id:        string,
 *   user_id:         string,
 *   alamat_tujuan:   string,
 *   jarak:           number,
 *   nilai_transaksi: number,
 *   source_app:      string,
 * }} input
 *
 * @returns {Promise<object>} data response untuk controller
 */
async function processRequestPengiriman(input) {
  const { order_id, user_id, alamat_tujuan, jarak, nilai_transaksi, source_app } = input;

  // ── 1. Cek duplikasi ─────────────────────────────────────────────
  const isDuplicate = await Shipment.isDuplicate(order_id);
  if (isDuplicate) {
    const err = new Error(`order_id ${order_id} sudah terdaftar.`);
    err.code  = 'DUPLICATE_ORDER';
    err.httpStatus = 400;
    throw err;
  }

  // ── 2. Insert shipment baru ──────────────────────────────────────
  const shipmentId = await Shipment.create({
    order_id,
    user_id,
    source_app,
    alamat_tujuan,
    jarak_km: jarak,
    nilai_transaksi,
  });
  logger.info(`[Shipment] Dibuat. shipment_id=${shipmentId}, order_id=${order_id}`);

  // Catat status awal PENDING ke tracking_logs
  await TrackingLog.insert(shipmentId, 'PENDING', 'Permintaan pengiriman diterima');

  // ── 3. Hitung biaya ──────────────────────────────────────────────
  const { ongkir, fee_layanan, total_biaya } = hitungSemuaBiaya(nilai_transaksi);
  logger.info(`[Biaya] ongkir=${ongkir}, fee_layanan=${fee_layanan}, total=${total_biaya}`);

  // ── 4. Simpan biaya ke DB ────────────────────────────────────────
  await Shipment.updateBiaya(order_id, { ongkir, fee_layanan, total_biaya });

  // ── 5. Kirim payment ke SmartBank ───────────────────────────────
  const paymentResult = await smartbankService.processPayment({
    shipmentId,
    orderId:    order_id,
    userId:     user_id,
    ongkir,
    feeLay:     fee_layanan,
    totalBiaya: total_biaya,
  });

  // ── 6 & 7. Update status berdasarkan hasil pembayaran ───────────
  if (paymentResult.success) {
    const { transaction_id } = paymentResult.data;

    // Update shipment → PROCESSING
    await Shipment.updateStatus(order_id, 'PROCESSING', transaction_id);

    // Catat tracking log
    await TrackingLog.insert(shipmentId, 'PROCESSING', 'Pembayaran ongkir berhasil, menunggu kurir');

    // Catat transaction log sukses
    await TransactionLog.insertSuccess({
      shipment_id:        shipmentId,
      order_id,
      user_id,
      amount:             total_biaya,
      ongkir,
      fee_layanan,
      transaction_id,
      smartbank_payload:  paymentResult.data,
      smartbank_response: paymentResult.data,
    });

    return {
      shipment_id:    shipmentId,
      order_id,
      status:         'PROCESSING',
      ongkir,
      fee_layanan,
      total_biaya,
      transaction_id,
      message:        'Pengiriman berhasil diproses dan pembayaran telah dilakukan.',
    };

  } else {
    const errData = paymentResult.error;

    // Jika SmartBank down (SYSTEM_ERROR) → shipment tetap PENDING untuk retry
    // Jika penolakan bisnis → shipment FAILED
    const newStatus = errData.is_system_error ? 'PENDING' : 'FAILED';
    await Shipment.updateStatus(order_id, newStatus);

    // Catat tracking log
    await TrackingLog.insert(
      shipmentId,
      newStatus,
      errData.is_system_error
        ? 'Pembayaran tertunda: SmartBank tidak dapat dihubungi'
        : `Pembayaran gagal: ${errData.error_code}`
    );

    // Catat transaction log gagal
    await TransactionLog.insertFailure({
      shipment_id:        shipmentId,
      order_id,
      user_id,
      amount:             total_biaya,
      ongkir,
      fee_layanan,
      error_code:         errData.error_code,
      error_message:      errData.message,
      smartbank_payload:  { order_id, shipmentId, total_biaya },
      smartbank_response: errData,
    });

    // Lempar error ke controller agar merespons dengan kode tepat
    const err = new Error(errData.message || 'Pembayaran gagal.');
    err.code          = errData.error_code || 'PAYMENT_FAILED';
    err.smartbank_error = errData.error_code;
    err.shipment_id   = shipmentId;
    err.shipment_status = newStatus;

    if (errData.is_system_error) {
      err.httpStatus = 503;
      err.code       = 'SMARTBANK_DOWN';
    } else if (['INSUFFICIENT_BALANCE', 'USER_NOT_FOUND'].includes(errData.error_code)) {
      err.httpStatus = 402;
    } else if (['DAILY_LIMIT_EXCEEDED', 'COOLDOWN_ACTIVE'].includes(errData.error_code)) {
      err.httpStatus = 429;
    } else {
      err.httpStatus = 402;
    }

    throw err;
  }
}

module.exports = { processRequestPengiriman };
