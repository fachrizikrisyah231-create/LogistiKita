'use strict';

const Shipment = require('../models/Shipment');
const respond = require('../utils/responseHelper');
const db = require('../config/database');
const ShipmentRoute = require('../models/ShipmentRoute');
const { SHIPMENT_STATUS } = require('../utils/constants');

class KurirController {
  constructor() {
    this.pickup = this.pickup.bind(this);
    this.tibaCabang = this.tibaCabang.bind(this);
    this.lanjutTransit = this.lanjutTransit.bind(this);
    this.antar = this.antar.bind(this);
    this.delivered = this.delivered.bind(this);
    this.gagal = this.gagal.bind(this);
  }

  async getTugas(req, res) {
    try {
      const kurirId = req.user.id;
      const query = `
        SELECT s.*, b.name as origin_branch_name, db.name as destination_branch_name
        FROM shipments s
        LEFT JOIN branches b ON s.origin_branch_id = b.id
        LEFT JOIN branches db ON s.destination_branch_id = db.id
        WHERE s.assigned_kurir_id = ? AND s.status NOT IN ('DELIVERED', 'FAILED')
        ORDER BY s.updated_at DESC
      `;
      const [shipments] = await db.query(query, [kurirId]);
      
      for (let s of shipments) {
        s.rute_cabang = await ShipmentRoute.getByShipmentId(s.id);
      }
      
      respond.success(res, 'Daftar tugas kurir', shipments);
    } catch (err) {
      respond.error(res, 'FETCH_FAILED', err.message, 500);
    }
  }

  async getRiwayat(req, res) {
    try {
      const kurirId = req.user.id;
      const query = `
        SELECT s.*, b.name as origin_branch_name, db.name as destination_branch_name
        FROM shipments s
        LEFT JOIN branches b ON s.origin_branch_id = b.id
        LEFT JOIN branches db ON s.destination_branch_id = db.id
        WHERE s.assigned_kurir_id = ? AND s.status IN ('DELIVERED', 'FAILED')
        ORDER BY s.updated_at DESC
      `;
      const [shipments] = await db.query(query, [kurirId]);
      respond.success(res, 'Riwayat pengiriman kurir', shipments);
    } catch (err) {
      respond.error(res, 'FETCH_FAILED', err.message, 500);
    }
  }

  async _updateStatus(req, res, status, requiredCurrentStatus, successMessage) {
    try {
      const { id } = req.params;
      const { branch_id, keterangan } = req.body;
      const kurirId = req.user.id;

      const validStatuses = Object.values(SHIPMENT_STATUS);
      if (!validStatuses.includes(status)) {
        return respond.error(res, 'INVALID_STATUS', 'Status tidak dikenali', 400);
      }

      const [rows] = await db.query('SELECT * FROM shipments WHERE id = ?', [id]);
      if (rows.length === 0) return respond.error(res, 'NOT_FOUND', 'Pengiriman tidak ditemukan', 404);
      
      const shipment = rows[0];
      if (shipment.assigned_kurir_id !== kurirId) {
        return respond.error(res, 'FORBIDDEN', 'Pengiriman ini bukan tugas Anda', 403);
      }

      if (requiredCurrentStatus && !requiredCurrentStatus.includes(shipment.status)) {
        return respond.error(res, 'INVALID_STATUS', `Status saat ini tidak valid untuk operasi ini. Status saat ini: ${shipment.status}`, 400);
      }

      // Update shipment
      const updates = ['status = ?'];
      const params = [status];
      if (branch_id) {
        updates.push('current_branch_id = ?');
        params.push(branch_id);
      }
      params.push(id);

      await db.query(`UPDATE shipments SET ${updates.join(', ')} WHERE id = ?`, params);

      // Insert tracking log
      await db.query(
        'INSERT INTO tracking_logs (shipment_id, status, keterangan, branch_id) VALUES (?, ?, ?, ?)',
        [id, status, keterangan || successMessage, branch_id || null]
      );

      // If AT_BRANCH, update shipment_routes
      if (status === 'AT_BRANCH' && branch_id) {
        await ShipmentRoute.updateArrived(id, branch_id);
      }
      
      // If IN_TRANSIT and was AT_BRANCH previously, update departed
      if (status === 'IN_TRANSIT' && shipment.status === 'AT_BRANCH' && shipment.current_branch_id) {
        await ShipmentRoute.updateDeparted(id, shipment.current_branch_id);
      }

      respond.success(res, successMessage, { shipment_id: id, status });
    } catch (err) {
      respond.error(res, 'UPDATE_FAILED', err.message, 500);
    }
  }

  async pickup(req, res) { return this._updateStatus(req, res, SHIPMENT_STATUS.PICKUP, [SHIPMENT_STATUS.PENDING], 'Kurir menuju lokasi penjemputan'); }
  async tibaCabang(req, res) { return this._updateStatus(req, res, SHIPMENT_STATUS.AT_BRANCH, [SHIPMENT_STATUS.PICKUP, SHIPMENT_STATUS.IN_TRANSIT], 'Paket tiba di cabang'); }
  async lanjutTransit(req, res) { return this._updateStatus(req, res, SHIPMENT_STATUS.IN_TRANSIT, [SHIPMENT_STATUS.AT_BRANCH, SHIPMENT_STATUS.PICKUP], 'Paket dalam perjalanan (transit)'); }
  async antar(req, res) { return this._updateStatus(req, res, SHIPMENT_STATUS.OUT_FOR_DELIVERY, [SHIPMENT_STATUS.AT_BRANCH, SHIPMENT_STATUS.PICKUP], 'Kurir sedang mengantar paket ke alamat tujuan'); }
  async delivered(req, res) { return this._updateStatus(req, res, SHIPMENT_STATUS.DELIVERED, [SHIPMENT_STATUS.OUT_FOR_DELIVERY], 'Paket berhasil dikirim'); }
  async gagal(req, res) { return this._updateStatus(req, res, SHIPMENT_STATUS.FAILED, null, 'Pengiriman gagal'); }
}

module.exports = new KurirController();
