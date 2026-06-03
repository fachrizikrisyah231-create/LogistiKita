'use strict';

const { query } = require('../config/database');

/**
 * Model untuk tabel tracking_logs.
 * Bersifat append-only — setiap perubahan status = baris baru.
 */
const TrackingLog = {
  /**
   * Menyisipkan entri tracking baru.
   * @param {string} shipment_id - UUID shipment
   * @param {string} status      - Status baru
   * @param {string} keterangan  - Deskripsi singkat
   */
  async insert(shipment_id, status, keterangan = '') {
    await query(
      `INSERT INTO tracking_logs (shipment_id, status, keterangan)
       VALUES (?, ?, ?)`,
      [shipment_id, status, keterangan]
    );
  },

  /**
   * Menyisipkan entri tracking berdasarkan order_id (subquery).
   * Lebih efisien jika hanya punya order_id, bukan shipment_id.
   */
  async insertByOrderId(order_id, status, keterangan = '') {
    await query(
      `INSERT INTO tracking_logs (shipment_id, status, keterangan)
       SELECT id, ?, ?
       FROM shipments
       WHERE order_id = ?`,
      [status, keterangan, order_id]
    );
  },

  /**
   * Mengambil semua riwayat status untuk sebuah shipment,
   * diurutkan dari yang paling lama.
   */
  async findByShipmentId(shipment_id) {
    const [rows] = await query(
      `SELECT status, keterangan, created_at AS timestamp
       FROM tracking_logs
       WHERE shipment_id = ?
       ORDER BY created_at ASC`,
      [shipment_id]
    );
    return rows;
  },

  /**
   * Mengambil riwayat status berdasarkan order_id (via JOIN).
   */
  async findByOrderId(order_id) {
    const [rows] = await query(
      `SELECT tl.status, tl.keterangan, tl.created_at AS timestamp
       FROM tracking_logs tl
       INNER JOIN shipments s ON tl.shipment_id = s.id
       WHERE s.order_id = ?
       ORDER BY tl.created_at ASC`,
      [order_id]
    );
    return rows;
  },
};

module.exports = TrackingLog;
