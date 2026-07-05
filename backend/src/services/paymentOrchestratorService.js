'use strict';
const Shipment = require('../models/Shipment');
const TrackingLog = require('../models/TrackingLog');
const TransactionLog = require('../models/TransactionLog');

class PaymentOrchestratorService {
  /**
   * Menggunakan konsep Dependency Injection (DIP)
   * di mana orchestrator hanya tahu metode pay() dari gateway.
   */
  constructor(paymentGateway) {
    this.gateway = paymentGateway;
  }

  async processPaymentAndLog(params) {
    const { shipment_id, order_id, user_id, ongkir, fee_layanan, total_biaya } = params;
    
    // Panggil gateway lewat abstraksi (interface injection)
    const result = await this.gateway.pay({
      shipmentId: shipment_id,
      orderId: order_id,
      userId: user_id,
      ongkir,
      feeLay: fee_layanan,
      totalBiaya: total_biaya
    });

    if (result.success) {
      await Shipment.updateStatus(order_id, 'PICKUP', result.data.transaction_id);
      await TrackingLog.insert(shipment_id, 'PICKUP', 'Pembayaran ongkir berhasil, menunggu kurir');
      await TransactionLog.insertSuccess({
        shipment_id, order_id, user_id,
        amount: total_biaya, ongkir, fee_layanan,
        transaction_id: result.data.transaction_id,
        smartbank_payload: { order_id, shipment_id, total_biaya },
        smartbank_response: result.data,
      });
      return { success: true, data: result.data };
    } else {
      const errData = result.error;
      await Shipment.updateStatus(order_id, 'FAILED');
      await TrackingLog.insert(shipment_id, 'FAILED', `Pembayaran gagal: ${errData.error_code}`);
      await TransactionLog.insertFailure({
        shipment_id, order_id, user_id,
        amount: total_biaya, ongkir, fee_layanan,
        error_code: errData.error_code,
        error_message: errData.message,
        smartbank_payload: { order_id, shipment_id, total_biaya },
        smartbank_response: errData,
      });
      return { success: false, error: errData };
    }
  }
}

module.exports = PaymentOrchestratorService;
