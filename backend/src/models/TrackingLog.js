'use strict';

const { query } = require('../config/database');

/**
 * Model untuk tabel tracking_logs.
 * Bersifat append-only — setiap perubahan status = baris baru.
 */
const TrackingLog = {
  /**
   * Menyisipkan entri tracking baru.
   */
  async insert(shipment_id, status, keterangan = '', branch_id = null) {
    await query(
      `INSERT INTO tracking_logs (shipment_id, status, keterangan, branch_id)
       VALUES (?, ?, ?, ?)`,
      [shipment_id, status, keterangan, branch_id]
    );
  },

  /**
   * Menyisipkan entri tracking berdasarkan order_id (subquery).
   */
  async insertByOrderId(order_id, status, keterangan = '', branch_id = null) {
    await query(
      `INSERT INTO tracking_logs (shipment_id, status, keterangan, branch_id)
       SELECT id, ?, ?, ?
       FROM shipments
       WHERE order_id = ?`,
      [status, keterangan, branch_id, order_id]
    );
  },

  /**
   * Mengambil semua riwayat status untuk sebuah shipment,
   * diurutkan dari yang paling lama.
   */
  async findByShipmentId(shipment_id) {
    const [rows] = await query(
      `SELECT tl.status, tl.keterangan, tl.created_at AS timestamp, b.name as branch_name
       FROM tracking_logs tl
       LEFT JOIN branches b ON tl.branch_id = b.id
       WHERE tl.shipment_id = ?
       ORDER BY tl.created_at ASC`,
      [shipment_id]
    );
    return rows;
  },

  /**
   * Mengambil riwayat status berdasarkan order_id (via JOIN).
   */
  async findByOrderId(order_id) {
    const [rows] = await query(
      `SELECT tl.status, tl.keterangan, tl.created_at AS timestamp, b.name as branch_name
       FROM tracking_logs tl
       INNER JOIN shipments s ON tl.shipment_id = s.id
       LEFT JOIN branches b ON tl.branch_id = b.id
       WHERE s.order_id = ?
       ORDER BY tl.created_at ASC`,
      [order_id]
    );
    return rows;
  },
};

module.exports = TrackingLog;
