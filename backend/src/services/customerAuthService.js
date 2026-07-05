'use strict';

const db = require('../config/database');
const bcrypt = require('bcryptjs');

class CustomerAuthService {
  async registerCustomer(userData) {
    const { name, email, password } = userData;
    
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      const err = new Error('Email sudah terdaftar');
      err.status = 400;
      throw err;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = `USR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    await db.query(
      'INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
      [userId, name, email, hashedPassword, 'customer']
    );

    return { id: userId, name, email, role: 'customer' };
  }

  async resetPassword(email) {
    // Logika reset sandi untuk pelanggan
    return true;
  }
}

module.exports = new CustomerAuthService();
