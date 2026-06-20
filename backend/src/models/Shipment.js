'use strict';

const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

/**
 * Model untuk tabel shipments.
 */
const Shipment = {
  /**
   * Membuat shipment baru.
   */
  async create({ 
    order_id, user_id, source_app, tipe_pengiriman,
    alamat_asal, lat_asal, lng_asal,
    alamat_tujuan, lat_tujuan, lng_tujuan,
    jarak_km, nilai_transaksi,
    origin_branch_id, destination_branch_id
  }) {
    const id = uuidv4();
    await query(
      `INSERT INTO shipments (
        id, order_id, user_id, source_app, tipe_pengiriman,
        alamat_asal, lat_asal, lng_asal,
        alamat_tujuan, lat_tujuan, lng_tujuan,
        jarak_km, nilai_transaksi,
        origin_branch_id, destination_branch_id,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [
        id, order_id, user_id, source_app, tipe_pengiriman,
        alamat_asal, lat_asal, lng_asal,
        alamat_tujuan, lat_tujuan, lng_tujuan,
        jarak_km, nilai_transaksi,
        origin_branch_id, destination_branch_id
      ]
    );
    return id;
  },

  async findByOrderId(order_id) {
    const [rows] = await query('SELECT * FROM shipments WHERE order_id = ? LIMIT 1', [order_id]);
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await query('SELECT * FROM shipments WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
  },

  async getAll() {
    const [rows] = await query('SELECT * FROM shipments ORDER BY created_at DESC');
    return rows;
  },

  async getByUserId(user_id) {
    const [rows] = await query('SELECT * FROM shipments WHERE user_id = ? ORDER BY created_at DESC', [user_id]);
    return rows;
  },

  async updateBiaya(order_id, { ongkir, fee_layanan, total_biaya }) {
    await query(
      `UPDATE shipments
       SET ongkir = ?, fee_layanan = ?, total_biaya = ?, updated_at = CURRENT_TIMESTAMP
       WHERE order_id = ?`,
      [ongkir, fee_layanan, total_biaya, order_id]
    );
  },

  async updateStatus(order_id, status, transaction_id = null) {
    if (transaction_id) {
      await query(
        `UPDATE shipments
         SET status = ?, transaction_id = ?, updated_at = CURRENT_TIMESTAMP
         WHERE order_id = ?`,
        [status, transaction_id, order_id]
      );
    } else {
      await query(
        `UPDATE shipments
         SET status = ?, updated_at = CURRENT_TIMESTAMP
         WHERE order_id = ?`,
        [status, order_id]
      );
    }
  },

  async isDuplicate(order_id) {
    const [rows] = await query('SELECT COUNT(*) AS total FROM shipments WHERE order_id = ?', [order_id]);
    return rows[0].total > 0;
  },

  async countTodayByUser(user_id) {
    const [rows] = await query(
      `SELECT COUNT(*) AS total_hari_ini
       FROM shipments
       WHERE user_id = ?
         AND DATE(created_at) = CURDATE()
         AND status NOT IN ('FAILED', 'PENDING')`,
      [user_id]
    );
    return rows[0].total_hari_ini;
  },

  async getLastTransactionTime(user_id) {
    const [rows] = await query(
      `SELECT MAX(created_at) AS last_transaction
       FROM shipments
       WHERE user_id = ?`,
      [user_id]
    );
    return rows[0].last_transaction || null;
  }
};

module.exports = Shipment;
