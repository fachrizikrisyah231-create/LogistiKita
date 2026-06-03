'use strict';

const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

/**
 * Model untuk tabel shipments.
 */
const Shipment = {
  /**
   * Membuat shipment baru dengan status PENDING.
   */
  async create({ order_id, user_id, source_app, alamat_tujuan, jarak_km, nilai_transaksi }) {
    const id = uuidv4();
    await query(
      `INSERT INTO shipments
         (id, order_id, user_id, source_app, alamat_tujuan, jarak_km, nilai_transaksi, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [id, order_id, user_id, source_app, alamat_tujuan, jarak_km, nilai_transaksi]
    );
    return id;
  },

  /**
   * Mencari shipment berdasarkan order_id.
   */
  async findByOrderId(order_id) {
    const [rows] = await query(
      'SELECT * FROM shipments WHERE order_id = ? LIMIT 1',
      [order_id]
    );
    return rows[0] || null;
  },

  /**
   * Mencari shipment berdasarkan id (shipment_id).
   */
  async findById(id) {
    const [rows] = await query(
      'SELECT * FROM shipments WHERE id = ? LIMIT 1',
      [id]
    );
    return rows[0] || null;
  },

  /**
   * Mengambil semua pengiriman, diurutkan dari yang terbaru.
   */
  async getAll() {
    const [rows] = await query(
      'SELECT * FROM shipments ORDER BY created_at DESC'
    );
    return rows;
  },

  /**
   * Menyimpan hasil kalkulasi biaya ke shipment.
   */
  async updateBiaya(order_id, { ongkir, fee_layanan, total_biaya }) {
    await query(
      `UPDATE shipments
       SET ongkir = ?, fee_layanan = ?, total_biaya = ?, updated_at = CURRENT_TIMESTAMP
       WHERE order_id = ?`,
      [ongkir, fee_layanan, total_biaya, order_id]
    );
  },

  /**
   * Update status shipment (dan transaction_id jika ada).
   */
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

  /**
   * Cek apakah order_id sudah terdaftar.
   * @returns {boolean}
   */
  async isDuplicate(order_id) {
    const [rows] = await query(
      'SELECT COUNT(*) AS total FROM shipments WHERE order_id = ?',
      [order_id]
    );
    return rows[0].total > 0;
  },

  /**
   * Menghitung jumlah transaksi berhasil user hari ini (untuk daily limit).
   */
  async countTodayByUser(user_id) {
    const [rows] = await query(
      `SELECT COUNT(*) AS total_hari_ini
       FROM shipments
       WHERE user_id = ?
         AND DATE(created_at) = CURDATE()
         AND status IN ('PROCESSING', 'SHIPPED', 'DELIVERED')`,
      [user_id]
    );
    return rows[0].total_hari_ini;
  },

  /**
   * Mendapatkan waktu transaksi terakhir user (untuk cooldown).
   * @returns {string|null}
   */
  async getLastTransactionTime(user_id) {
    const [rows] = await query(
      `SELECT MAX(created_at) AS last_transaction
       FROM shipments
       WHERE user_id = ?`,
      [user_id]
    );
    return rows[0].last_transaction || null;
  },
};

module.exports = Shipment;
