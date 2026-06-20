'use strict';

const authService = require('../services/authService');
const respond = require('../utils/responseHelper');
const logger = require('../utils/logger');

class AuthController {
  async register(req, res) {
    try {
      const { name, email, password } = req.body;
      
      if (!name || !email || !password) {
        return respond.error(res, 'VALIDATION_ERROR', 'Name, email, dan password harus diisi', 400);
      }

      if (password.length < 6) {
        return respond.error(res, 'VALIDATION_ERROR', 'Password minimal 6 karakter', 400);
      }

      const { user, token } = await authService.register(name, email, password);
      
      respond.success(res, 'Registrasi berhasil', { user, token }, 201);
    } catch (err) {
      logger.error('[Auth] Register Error:', err.message);
      const status = err.status || 500;
      respond.error(res, 'REGISTRATION_FAILED', err.message, status);
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return respond.error(res, 'VALIDATION_ERROR', 'Email dan password harus diisi', 400);
      }

      const { user, token } = await authService.login(email, password);
      
      respond.success(res, 'Login berhasil', { user, token });
    } catch (err) {
      logger.error('[Auth] Login Error:', err.message);
      const status = err.status || 500;
      respond.error(res, 'LOGIN_FAILED', err.message, status);
    }
  }

  async me(req, res) {
    // req.user diset oleh authMiddleware
    respond.success(res, 'Profil user', { user: req.user });
  }
}

module.exports = new AuthController();
