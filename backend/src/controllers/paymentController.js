'use strict';

const SmartBankAdapter = require('../services/smartbankAdapter');
const PaymentOrchestratorService = require('../services/paymentOrchestratorService');

// Injeksi antarmuka secara dinamis (DIP)
const paymentGateway = new SmartBankAdapter();
const paymentOrchestrator = new PaymentOrchestratorService(paymentGateway);
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
    const result = await paymentOrchestrator.processPaymentAndLog({
      shipment_id, order_id, user_id, ongkir, fee_layanan, total_biaya
    });

    if (result.success) {
      return respond.success(res, {
        payment_status:  'SUCCESS',
        transaction_id:  result.data.transaction_id,
        shipment_status: 'PICKUP',
        deducted_amounts: result.data.deducted_amounts,
        message:         'Pembayaran ongkir berhasil diproses oleh SmartBank.',
      });
    } else {
      return respond.error(
        res,
        'PAYMENT_FAILED',
        result.error.message || 'SmartBank menolak pembayaran.',
        402,
        { smartbank_error: result.error.error_code }
      );
    }
  } catch (err) {
    logger.error('[Controller] pembayaran_logistik error:', err.message);
    return respond.error(res, 'INTERNAL_ERROR', 'Terjadi kesalahan internal.', 500);
  }
}

module.exports = { pembayaranLogistik };
