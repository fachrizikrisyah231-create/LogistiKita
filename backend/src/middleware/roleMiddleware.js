'use strict';

const respond = require('../utils/responseHelper');

/**
 * Middleware untuk membatasi akses berdasarkan role pengguna.
 * @param  {...string} allowedRoles Daftar role yang diizinkan (contoh: 'admin', 'kurir')
 */
function roleMiddleware(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return respond.error(res, 'UNAUTHORIZED', 'Akses ditolak. Silakan login terlebih dahulu.', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return respond.error(res, 'FORBIDDEN', 'Akses ditolak. Anda tidak memiliki izin untuk resource ini.', 403);
    }

    next();
  };
}

module.exports = roleMiddleware;
