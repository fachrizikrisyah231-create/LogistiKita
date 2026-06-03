'use strict';

const { hitungOngkir, hitungSemuaBiaya } = require('../services/costCalculatorService');
const respond = require('../utils/responseHelper');
const logger  = require('../utils/logger');

/**
 * POST /logistikita/biaya_pengiriman
 *
 * Menghitung estimasi biaya pengiriman.
 * Dapat digunakan frontend untuk preview biaya sebelum checkout.
 * Bersifat informational — tidak memproses pembayaran.
 *
 * Middleware: authMiddleware
 */
function hitungBiayaPengiriman(req, res) {
  const { nilai_transaksi, jarak } = req.body;

  // ── Validasi ───────────────────────────────────────────────────
  if (!nilai_transaksi || typeof nilai_transaksi !== 'number' || nilai_transaksi <= 0) {
    return respond.error(res, 'VALIDATION_ERROR', "Field 'nilai_transaksi' harus berupa angka positif.", 400, { fields: ['nilai_transaksi'] });
  }
  if (!jarak || typeof jarak !== 'number' || jarak <= 0) {
    return respond.error(res, 'VALIDATION_ERROR', "Field 'jarak' harus berupa angka positif (km).", 400, { fields: ['jarak'] });
  }

  logger.info(`[Controller] POST /biaya_pengiriman — nilai_transaksi=${nilai_transaksi}, jarak=${jarak}`);

  const { ongkir, ongkir_raw, fee_layanan, total_biaya, catatan_ongkir } = hitungSemuaBiaya(nilai_transaksi);

  return respond.success(res, {
    nilai_transaksi,
    jarak_km:             jarak,
    ongkir_raw,
    ongkir_final:         ongkir,
    fee_layanan_estimasi: fee_layanan,
    total_estimasi:       total_biaya,
    catatan:              catatan_ongkir,
  });
}

module.exports = { hitungBiayaPengiriman };
