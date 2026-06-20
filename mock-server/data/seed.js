'use strict';

/**
 * Seed data untuk Mock SmartBank.
 * Berisi state awal yang digunakan setiap kali server start atau reset.
 */
const INITIAL_STATE = {
  // Saldo setiap user (key: user_id, value: saldo Rupiah)
  balances: {
    'USR-001': 5000000,
    'USR-002': 5000000,
    'USR-003': 5000000,
    'USR-004': 5000000,
    'USR-005': 5000000,
    'USR-006': 5000000,
  },

  // Akun layanan (penampung kredit dari transaksi)
  serviceAccounts: {
    'logistikita':  0,
    'gateway':      0,
    'bank_reserve': 0,
  },

  // Ledger semua transaksi (append-only)
  ledger: [],

  // Riwayat transaksi per user (untuk daily limit & cooldown)
  // Format: { [user_id]: [{ timestamp, transaction_id, amount }] }
  userTransactions: {},

  // Konfigurasi perilaku mock (bisa diubah via /mock/smartbank/config)
  mockConfig: {
    force_error: null,    // null | 'INSUFFICIENT_BALANCE' | 'USER_NOT_FOUND' | 'DAILY_LIMIT_EXCEEDED' | 'COOLDOWN_ACTIVE' | 'SYSTEM_ERROR'
    latency_ms: 100,
  },
};

module.exports = { INITIAL_STATE };
