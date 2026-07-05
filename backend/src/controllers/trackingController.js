'use strict';

const respond = require('../utils/responseHelper');
const logger = require('../utils/logger');
const trackingService = require('../services/trackingService');

class TrackingController {
  async getTracking(req, res) {
    const { order_id } = req.params;

    if (!order_id || order_id.trim() === '') {
      return respond.error(res, 'VALIDATION_ERROR', "Parameter 'order_id' wajib diisi.", 400);
    }

    try {
      const trackingData = await trackingService.getFullTrackingData(order_id);
      return respond.success(res, 'Data tracking', trackingData);
    } catch (err) {
      if (err.code === 'NOT_FOUND') {
        return respond.error(res, err.code, err.message, err.status);
      }
      logger.error('[Controller] getTracking error:', err.message);
      return respond.error(res, 'INTERNAL_ERROR', 'Terjadi kesalahan internal.', 500);
    }
  }
}

module.exports = new TrackingController();
