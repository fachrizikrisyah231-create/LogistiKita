'use strict';

const db = require('../config/database');
const bcrypt = require('bcryptjs');
const respond = require('../utils/responseHelper');
const User = require('../models/User');
const Branch = require('../models/Branch');

class AdminController {
  async getOverview(req, res) {
    try {
      const [[{ total_users }]] = await db.query('SELECT COUNT(*) as total_users FROM users');
      const [[{ total_shipments }]] = await db.query('SELECT COUNT(*) as total_shipments FROM shipments');
      const [[{ total_revenue }]] = await db.query('SELECT SUM(fee_layanan) as total_revenue FROM shipments WHERE status = "DELIVERED"');
      const [[{ pending_shipments }]] = await db.query('SELECT COUNT(*) as pending_shipments FROM shipments WHERE status = "PENDING"');

      respond.success(res, 'Admin Overview', {
        total_users,
        total_shipments,
        total_revenue: total_revenue || 0,
        pending_shipments
      });
    } catch (err) {
      respond.error(res, 'FETCH_FAILED', err.message, 500);
    }
  }

  async getKeuangan(req, res) {
    try {
      const [transactions] = await db.query('SELECT * FROM transaction_logs ORDER BY created_at DESC LIMIT 100');
      const [[{ total_revenue }]] = await db.query('SELECT SUM(fee_layanan) as total_revenue FROM transaction_logs WHERE payment_status = "SUCCESS"');
      
      respond.success(res, 'Data Keuangan', {
        total_revenue: total_revenue || 0,
        transactions
      });
    } catch (err) {
      respond.error(res, 'FETCH_FAILED', err.message, 500);
    }
  }

  async getUsers(req, res) {
    try {
      const users = await User.getAll();
      respond.success(res, 'Daftar User', users);
    } catch (err) {
      respond.error(res, 'FETCH_FAILED', err.message, 500);
    }
  }

  async createUser(req, res) {
    try {
      const { name, email, password, role, branch_id } = req.body;
      if (!name || !email || !password) {
        return respond.error(res, 'VALIDATION_ERROR', 'Name, email, password wajib diisi', 400);
      }

      const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
      if (existing.length > 0) return respond.error(res, 'DUPLICATE', 'Email sudah terdaftar', 400);

      const hashedPassword = await bcrypt.hash(password, 10);
      const userId = `USR-${Date.now()}`;

      await db.query(
        'INSERT INTO users (id, name, email, password, role, branch_id) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, name, email, hashedPassword, role || 'customer', branch_id || null]
      );

      respond.success(res, 'User berhasil dibuat', { id: userId, name, email, role }, 201);
    } catch (err) {
      respond.error(res, 'CREATE_FAILED', err.message, 500);
    }
  }

  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const data = req.body;
      const success = await User.update(id, data);
      if (!success) return respond.error(res, 'UPDATE_FAILED', 'Gagal update user atau data tidak berubah', 400);
      respond.success(res, 'User berhasil diupdate');
    } catch (err) {
      respond.error(res, 'UPDATE_FAILED', err.message, 500);
    }
  }

  async getCabang(req, res) {
    try {
      const branches = await Branch.getAll();
      respond.success(res, 'Daftar Cabang', branches);
    } catch (err) {
      respond.error(res, 'FETCH_FAILED', err.message, 500);
    }
  }

  async createCabang(req, res) {
    try {
      const { name, city, latitude, longitude, route_order } = req.body;
      if (!name || !city || latitude === undefined || longitude === undefined || route_order === undefined) {
        return respond.error(res, 'VALIDATION_ERROR', 'Semua field wajib diisi', 400);
      }

      const id = `BRC-${Date.now()}`;
      await Branch.create({ id, name, city, latitude, longitude, route_order });
      respond.success(res, 'Cabang berhasil dibuat', { id, name }, 201);
    } catch (err) {
      respond.error(res, 'CREATE_FAILED', err.message, 500);
    }
  }

  async updateCabang(req, res) {
    try {
      const { id } = req.params;
      const data = req.body;
      const success = await Branch.update(id, data);
      if (!success) return respond.error(res, 'UPDATE_FAILED', 'Gagal update cabang', 400);
      respond.success(res, 'Cabang berhasil diupdate');
    } catch (err) {
      respond.error(res, 'UPDATE_FAILED', err.message, 500);
    }
  }

  async getKurirList(req, res) {
    try {
      const kurir = await User.getAll('kurir');
      respond.success(res, 'Daftar Kurir', kurir);
    } catch (err) {
      respond.error(res, 'FETCH_FAILED', err.message, 500);
    }
  }

  async getShipments(req, res) {
    try {
      const [shipments] = await db.query('SELECT * FROM shipments ORDER BY created_at DESC');
      respond.success(res, 'Daftar Pengiriman', shipments);
    } catch (err) {
      respond.error(res, 'FETCH_FAILED', err.message, 500);
    }
  }

  async updateShipmentStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      await db.query('UPDATE shipments SET status = ? WHERE id = ?', [status, id]);
      respond.success(res, 'Status pengiriman berhasil diupdate');
    } catch (err) {
      respond.error(res, 'UPDATE_FAILED', err.message, 500);
    }
  }

  async assignKurir(req, res) {
    try {
      const { id } = req.params;
      const { kurir_id } = req.body;
      await db.query('UPDATE shipments SET assigned_kurir_id = ? WHERE id = ?', [kurir_id, id]);
      respond.success(res, 'Kurir berhasil di-assign');
    } catch (err) {
      respond.error(res, 'ASSIGN_FAILED', err.message, 500);
    }
  }
}

module.exports = new AdminController();
