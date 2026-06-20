'use strict';

const Shipment = require('../models/Shipment');
const logger   = require('../utils/logger');
const respond  = require('../utils/responseHelper');

const MAX_DAILY = parseInt(process.env.MAX_DAILY_TRANSACTIONS) || 10;
const COOLDOWN  = parseInt(process.env.COOLDOWN_SECONDS_MIN)   || 10;

/**
 * Middleware: Rate limiting berbasis DB.
 * 1. Daily limit  — max 10 transaksi sukses/user/hari
 * 2. Cooldown     — min 10 detik jeda antar transaksi
 *
 * Harus dipakai SETELAH authMiddleware (butuh req.user.user_id).
 */
async function rateLimitMiddleware(req, res, next) {
  const user_id = req.user?.id || req.user?.user_id;
  if (!user_id) {
    // Seharusnya tidak terjadi jika dipasang setelah authMiddleware
    return respond.error(res, 'UNAUTHORIZED', 'User tidak teridentifikasi.', 401);
  }

  try {
    // ── 1. Cek daily limit ──────────────────────────────────────────
    const countToday = await Shipment.countTodayByUser(user_id);
    if (countToday >= MAX_DAILY) {
      logger.warn(`[RateLimit] User ${user_id} mencapai daily limit (${countToday}/${MAX_DAILY}).`);
      return respond.error(
        res,
        'DAILY_LIMIT_EXCEEDED',
        `User ${user_id} telah mencapai batas maksimum ${MAX_DAILY} transaksi hari ini.`,
        429
      );
    }

    // ── 2. Cek cooldown ─────────────────────────────────────────────
    const lastTx = await Shipment.getLastTransactionTime(user_id);
    if (lastTx) {
      const lastTxDate  = new Date(lastTx);
      const diffSeconds = (Date.now() - lastTxDate.getTime()) / 1000;
      if (diffSeconds < COOLDOWN) {
        const retryAfter = Math.ceil(COOLDOWN - diffSeconds);
        logger.warn(`[RateLimit] User ${user_id} cooldown aktif. Sisa: ${retryAfter}s.`);
        return respond.error(
          res,
          'COOLDOWN_ACTIVE',
          `Transaksi terlalu cepat. Tunggu ${retryAfter} detik sebelum transaksi berikutnya.`,
          429,
          { retry_after_seconds: retryAfter }
        );
      }
    }

    next();
  } catch (err) {
    logger.error('[RateLimit] Gagal cek rate limit:', err.message);
    next(); // Biarkan request lanjut agar tidak memblokir jika DB lambat sesaat
  }
}

module.exports = rateLimitMiddleware;
