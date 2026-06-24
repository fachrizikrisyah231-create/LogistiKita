'use strict';

const Shipment       = require('../models/Shipment');
const TrackingLog    = require('../models/TrackingLog');
const TransactionLog = require('../models/TransactionLog');
const smartbankService = require('../services/smartbankService');
const respond          = require('../utils/responseHelper');
const logger           = require('../utils/logger');

/**
 * POST /logistikita/pembayaran_logistik
 *
 * Mengirimkan payment request ke SmartBank via Gateway.
 * Dipanggil otomatis oleh shipmentService dalam alur request_pengiriman.
 * Endpoint ini juga tersedia untuk keperluan testing/debug langsung.
 *
 * Middleware: authMiddleware
 */
async function pembayaranLogistik(req, res) {
  const { shipment_id, order_id, ongkir, fee_layanan, total_biaya } = req.body;
  const user_id = req.user?.id || req.body.user_id;

  // ── Validasi ───────────────────────────────────────────────────
  if (!shipment_id) return respond.error(res, 'VALIDATION_ERROR', "Field 'shipment_id' wajib diisi.", 400);
  if (!order_id)    return respond.error(res, 'VALIDATION_ERROR', "Field 'order_id' wajib diisi.", 400);
  if (!user_id)     return respond.error(res, 'VALIDATION_ERROR', "Field 'user_id' wajib diisi.", 400);
  if (typeof ongkir !== 'number' || ongkir <= 0)
    return respond.error(res, 'VALIDATION_ERROR', "Field 'ongkir' harus berupa angka positif.", 400);
  if (typeof fee_layanan !== 'number' || fee_layanan < 0)
    return respond.error(res, 'VALIDATION_ERROR', "Field 'fee_layanan' harus berupa angka non-negatif.", 400);
  if (typeof total_biaya !== 'number' || total_biaya <= 0)
    return respond.error(res, 'VALIDATION_ERROR', "Field 'total_biaya' harus berupa angka positif.", 400);

  logger.info(`[Controller] POST /pembayaran_logistik — order_id=${order_id}, total=${total_biaya}`);

  try {
    const result = await smartbankService.processPayment({
      shipmentId: shipment_id,
      orderId:    order_id,
      userId:     user_id,
      ongkir,
      feeLay:     fee_layanan,
      totalBiaya: total_biaya,
    });

    if (result.success) {
      // Update shipment status
      await Shipment.updateStatus(order_id, 'PICKUP', result.data.transaction_id);
      await TrackingLog.insert(shipment_id, 'PICKUP', 'Pembayaran ongkir berhasil, menunggu kurir');
      await TransactionLog.insertSuccess({
        shipment_id, order_id, user_id,
        amount: total_biaya, ongkir, fee_layanan,
        transaction_id:     result.data.transaction_id,
        smartbank_payload:  { order_id, shipment_id, total_biaya },
        smartbank_response: result.data,
      });

      return respond.success(res, {
        payment_status:  'SUCCESS',
        transaction_id:  result.data.transaction_id,
        shipment_status: 'PICKUP',
        deducted_amounts: result.data.deducted_amounts,
        message:         'Pembayaran ongkir berhasil diproses oleh SmartBank.',
      });

    } else {
      const errData = result.error;
      await Shipment.updateStatus(order_id, 'FAILED');
      await TrackingLog.insert(shipment_id, 'FAILED', `Pembayaran gagal: ${errData.error_code}`);
      await TransactionLog.insertFailure({
        shipment_id, order_id, user_id,
        amount: total_biaya, ongkir, fee_layanan,
        error_code:         errData.error_code,
        error_message:      errData.message,
        smartbank_payload:  { order_id, shipment_id, total_biaya },
        smartbank_response: errData,
      });

      return respond.error(
        res,
        'PAYMENT_FAILED',
        errData.message || 'SmartBank menolak pembayaran.',
        402,
        { smartbank_error: errData.error_code }
      );
    }
  } catch (err) {
    logger.error('[Controller] pembayaran_logistik error:', err.message);
    return respond.error(res, 'INTERNAL_ERROR', 'Terjadi kesalahan internal.', 500);
  }
}

module.exports = { pembayaranLogistik };
