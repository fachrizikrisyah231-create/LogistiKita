'use strict';
const smartbankService = require('./smartbankService');

/**
 * Adapter untuk SmartBank yang mematuhi antarmuka/interface PaymentGateway.
 * Metode utamanya adalah `pay()`.
 */
class SmartBankAdapter {
  async pay(params) {
    // Menjembatani panggilan dari abstraksi PaymentGateway ke implementasi spesifik SmartBank
    return await smartbankService.processPayment(params);
  }
}

module.exports = SmartBankAdapter;
