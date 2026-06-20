'use strict';

const db = require('../config/database');

class Branch {
  async findById(id) {
    const [rows] = await db.query('SELECT * FROM branches WHERE id = ?', [id]);
    return rows[0];
  }

  async getAllActive() {
    const [rows] = await db.query('SELECT * FROM branches WHERE is_active = TRUE ORDER BY route_order ASC');
    return rows;
  }

  async getAll() {
    const [rows] = await db.query('SELECT * FROM branches ORDER BY route_order ASC');
    return rows;
  }

  async create(data) {
    const query = `
      INSERT INTO branches (id, name, city, latitude, longitude, route_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const params = [data.id, data.name, data.city, data.latitude, data.longitude, data.route_order];
    const [result] = await db.query(query, params);
    return result.affectedRows > 0;
  }

  async update(id, data) {
    const fields = [];
    const params = [];

    if (data.name !== undefined) { fields.push('name = ?'); params.push(data.name); }
    if (data.city !== undefined) { fields.push('city = ?'); params.push(data.city); }
    if (data.latitude !== undefined) { fields.push('latitude = ?'); params.push(data.latitude); }
    if (data.longitude !== undefined) { fields.push('longitude = ?'); params.push(data.longitude); }
    if (data.route_order !== undefined) { fields.push('route_order = ?'); params.push(data.route_order); }
    if (data.is_active !== undefined) { fields.push('is_active = ?'); params.push(data.is_active); }

    if (fields.length === 0) return false;

    params.push(id);
    const query = `UPDATE branches SET ${fields.join(', ')} WHERE id = ?`;
    const [result] = await db.query(query, params);
    return result.affectedRows > 0;
  }
}

module.exports = new Branch();
