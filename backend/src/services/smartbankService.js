'use strict';

const axios  = require('axios');
const logger = require('../utils/logger');
require('dotenv').config();

const GATEWAY_BASE_URL = process.env.GATEWAY_BASE_URL || 'http://localhost:5000';
const GATEWAY_API_KEY  = process.env.GATEWAY_API_KEY  || '';
const TIMEOUT_MS       = 15000; // 15 detik

/**
 * Mengirim payment request ke SmartBank melalui API Gateway.
 *
 * @param {{
 *   shipmentId: string,
 *   orderId:    string,
 *   userId:     string,
 *   ongkir:     number,
 *   feeLay:     number,
 *   totalBiaya: number,
 * }} params
 *
 * @returns {Promise<{ success: boolean, data?: object, error?: object }>}
 */
async function processPayment({ shipmentId, orderId, userId, ongkir, feeLay, totalBiaya }) {
  const payload = {
    from_app:    'logistikita',
    from_user:   userId,
    to_service:  'logistikita',
    amount:      totalBiaya,
    metadata: {
      order_id:    orderId,
      shipment_id: shipmentId,
      type:        'ongkir',
      breakdown: {
        ongkir,
        fee_layanan_logistik: feeLay,
      },
    },
  };

  logger.info(`[SmartBank] Mengirim payment request. order_id=${orderId}, amount=${totalBiaya}`);

  try {
    const response = await axios.post(
      `${GATEWAY_BASE_URL}/logistics/pay`,
      payload,
      {
        headers: {
          'Authorization':  `Bearer ${GATEWAY_API_KEY}`,
          'Content-Type':   'application/json',
          'X-Source-App':   'logistikita',
        },
        timeout: TIMEOUT_MS,
      }
    );

    const data = response.data;

    if (data.status === 'SUCCESS') {
      logger.info(`[SmartBank] Pembayaran SUKSES. transaction_id=${data.transaction_id}`);
      return { success: true, data };
    } else {
      // SmartBank mengembalikan HTTP 200 tapi status FAILED (penolakan bisnis)
      logger.warn(`[SmartBank] Pembayaran DITOLAK. error_code=${data.error_code}`);
      return { success: false, error: data };
    }
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
      logger.error('[SmartBank] SmartBank/Gateway tidak dapat dihubungi:', err.message);
      return {
        success: false,
        error: {
          error_code:  'SYSTEM_ERROR',
          message:     'SmartBank atau API Gateway tidak dapat dihubungi.',
          is_system_error: true,
        },
      };
    }

    // Error HTTP 4xx/5xx dari Gateway
    const errData = err.response?.data || {};
    logger.error('[SmartBank] Error dari Gateway:', errData);
    return {
      success: false,
      error: {
        error_code: errData.error_code || 'GATEWAY_ERROR',
        message:    errData.message    || 'Terjadi kesalahan pada API Gateway.',
        is_system_error: false,
      },
    };
  }
}

module.exports = { processPayment };
