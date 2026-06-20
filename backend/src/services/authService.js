'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 10;

class AuthService {
  async register(name, email, password) {
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      const err = new Error('Email sudah terdaftar');
      err.status = 400;
      throw err;
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const userId = `USR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    await db.query(
      'INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
      [userId, name, email, hashedPassword, 'customer']
    );

    const user = { id: userId, name, email, role: 'customer' };
    const token = this.generateToken(user);
    
    return { user, token };
  }

  async login(email, password) {
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      const err = new Error('Email atau password salah');
      err.status = 401;
      throw err;
    }

    const user = users[0];
    if (!user.is_active) {
      const err = new Error('Akun tidak aktif');
      err.status = 403;
      throw err;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const err = new Error('Email atau password salah');
      err.status = 401;
      throw err;
    }

    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      branch_id: user.branch_id
    };
    
    const token = this.generateToken(userData);
    
    return { user: userData, token };
  }

  generateToken(user) {
    return jwt.sign(
      { id: user.id, email: user.email, role: user.role, branch_id: user.branch_id },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }
}

module.exports = new AuthService();
