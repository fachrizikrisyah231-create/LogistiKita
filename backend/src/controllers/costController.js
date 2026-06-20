'use strict';

const haversineService = require('../services/haversineService');
const { hitungSemuaBiaya } = require('../services/costCalculatorService');
const respond = require('../utils/responseHelper');

class CostController {
  async estimasiBiaya(req, res) {
    const { lat_asal, lng_asal, lat_tujuan, lng_tujuan, tipe_pengiriman } = req.body;

    if (lat_asal === undefined || lng_asal === undefined || lat_tujuan === undefined || lng_tujuan === undefined || !tipe_pengiriman) {
      return respond.error(res, 'VALIDATION_ERROR', 'Koordinat asal, tujuan, dan tipe pengiriman wajib diisi.', 400);
    }

    try {
      const jarakKm = haversineService.calculateDistance(lat_asal, lng_asal, lat_tujuan, lng_tujuan);
      
      const maxSameday = parseInt(process.env.SAMEDAY_MAX_KM) || 50;
      const maxNextday = parseInt(process.env.NEXTDAY_MAX_KM) || 250;

      if (tipe_pengiriman === 'sameday' && jarakKm > maxSameday) {
        return respond.error(res, 'VALIDATION_ERROR', `Jarak terlalu jauh untuk Sameday (maks ${maxSameday} km). Jarak Anda: ${jarakKm} km.`, 400);
      }
      if (tipe_pengiriman === 'nextday' && jarakKm > maxNextday) {
        return respond.error(res, 'VALIDATION_ERROR', `Jarak terlalu jauh untuk Nextday (maks ${maxNextday} km). Jarak Anda: ${jarakKm} km.`, 400);
      }

      const biaya = hitungSemuaBiaya(jarakKm, tipe_pengiriman);

      respond.success(res, 'Estimasi biaya', {
        jarak_km: jarakKm,
        tipe_pengiriman,
        ...biaya
      });
    } catch (err) {
      respond.error(res, 'CALCULATION_FAILED', err.message, 500);
    }
  }
}

module.exports = new CostController();
