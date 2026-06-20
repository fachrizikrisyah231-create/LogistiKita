'use strict';

const db = require('../config/database');

class User {
  async findById(id) {
    const [rows] = await db.query('SELECT id, name, email, role, branch_id, is_active, created_at FROM users WHERE id = ?', [id]);
    return rows[0];
  }

  async findByEmail(email) {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0];
  }

  async getAll(role = null) {
    let query = 'SELECT id, name, email, role, branch_id, is_active, created_at FROM users';
    const params = [];
    if (role) {
      query += ' WHERE role = ?';
      params.push(role);
    }
    query += ' ORDER BY created_at DESC';
    const [rows] = await db.query(query, params);
    return rows;
  }

  async update(id, data) {
    const fields = [];
    const params = [];
    
    if (data.name !== undefined) { fields.push('name = ?'); params.push(data.name); }
    if (data.email !== undefined) { fields.push('email = ?'); params.push(data.email); }
    if (data.role !== undefined) { fields.push('role = ?'); params.push(data.role); }
    if (data.branch_id !== undefined) { fields.push('branch_id = ?'); params.push(data.branch_id); }
    if (data.is_active !== undefined) { fields.push('is_active = ?'); params.push(data.is_active); }

    if (fields.length === 0) return false;

    params.push(id);
    const query = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    const [result] = await db.query(query, params);
    return result.affectedRows > 0;
  }
}

module.exports = new User();
