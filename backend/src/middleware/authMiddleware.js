'use strict';

const jwt     = require('jsonwebtoken');
const logger  = require('../utils/logger');
const respond = require('../utils/responseHelper');

/**
 * Middleware: Validasi JWT token dari header Authorization.
 * Menyuntikkan req.user = { user_id, email, ... } jika valid.
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return respond.error(res, 'MISSING_TOKEN', 'Header Authorization tidak ditemukan atau format salah.', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { user_id, email, iat, exp }
    logger.debug(`[Auth] Token valid untuk user: ${decoded.user_id}`);
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return respond.error(res, 'TOKEN_EXPIRED', 'Token JWT sudah expired.', 401);
    }
    return respond.error(res, 'INVALID_TOKEN', 'Token JWT tidak valid.', 401);
  }
}

module.exports = authMiddleware;
