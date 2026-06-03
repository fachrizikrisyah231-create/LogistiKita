'use strict';

const { query } = require('../config/database');

/**
 * Model untuk tabel transaction_logs.
 * Audit trail semua percobaan pembayaran ke SmartBank (sukses maupun gagal).
 */
const TransactionLog = {
  /**
   * Menyisipkan log transaksi sukses.
   */
  async insertSuccess({
    shipment_id,
    order_id,
    user_id,
    amount,
    ongkir,
    fee_layanan,
    transaction_id,
    smartbank_payload,
    smartbank_response,
  }) {
    await query(
      `INSERT INTO transaction_logs
         (shipment_id, order_id, user_id, amount, ongkir, fee_layanan,
          payment_status, transaction_id, smartbank_payload, smartbank_response)
       VALUES (?, ?, ?, ?, ?, ?, 'SUCCESS', ?, ?, ?)`,
      [
        shipment_id, order_id, user_id, amount, ongkir, fee_layanan,
        transaction_id,
        JSON.stringify(smartbank_payload),
        JSON.stringify(smartbank_response),
      ]
    );
  },

  /**
   * Menyisipkan log transaksi gagal.
   */
  async insertFailure({
    shipment_id,
    order_id,
    user_id,
    amount,
    ongkir,
    fee_layanan,
    error_code,
    error_message,
    smartbank_payload,
    smartbank_response,
  }) {
    await query(
      `INSERT INTO transaction_logs
         (shipment_id, order_id, user_id, amount, ongkir, fee_layanan,
          payment_status, error_code, error_message, smartbank_payload, smartbank_response)
       VALUES (?, ?, ?, ?, ?, ?, 'FAILED', ?, ?, ?, ?)`,
      [
        shipment_id, order_id, user_id, amount, ongkir, fee_layanan,
        error_code || null,
        error_message || null,
        JSON.stringify(smartbank_payload),
        JSON.stringify(smartbank_response),
      ]
    );
  },

  /**
   * Mengambil semua log transaksi untuk sebuah shipment.
   */
  async findByShipmentId(shipment_id) {
    const [rows] = await query(
      `SELECT * FROM transaction_logs
       WHERE shipment_id = ?
       ORDER BY created_at DESC`,
      [shipment_id]
    );
    return rows;
  },
};

module.exports = TransactionLog;
