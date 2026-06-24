'use strict';

require('dotenv').config();
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { INITIAL_STATE } = require('./data/seed');

const app  = express();
const PORT = parseInt(process.env.SMARTBANK_PORT) || 4000;

const FEE_BANK  = parseFloat(process.env.FEE_BANK_PERCENTAGE)     || 0.01;
const TAX       = parseFloat(process.env.TAX_PERCENTAGE)           || 0.02;
const COOLDOWN  = parseInt(process.env.COOLDOWN_SECONDS)           || 10;
const MAX_DAILY = parseInt(process.env.MAX_DAILY_TRANSACTIONS)     || 10;
const SALDO_AWAL = parseInt(process.env.SALDO_AWAL_USER)           || 50000;

app.use(express.json());

// ─── CORS ─────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// ─── STATE ────────────────────────────────────────────────────────────
// Deep clone agar INITIAL_STATE tidak termutasi
let state = JSON.parse(JSON.stringify(INITIAL_STATE));

// ─── HELPERS ──────────────────────────────────────────────────────────
function log(method, path, extra = '') {
  console.log(`[${new Date().toISOString()}] [SmartBank] ${method} ${path} ${extra}`);
}

function countTodayTransactions(userId) {
  const list  = state.userTransactions[userId] || [];
  const today = new Date().toDateString();
  return list.filter(tx => new Date(tx.timestamp).toDateString() === today).length;
}

function getLastTransactionTime(userId) {
  const list = state.userTransactions[userId] || [];
  if (list.length === 0) return null;
  return list[list.length - 1].timestamp;
}

function generateTxId() {
  return `TRX-SBANK-${String(state.ledger.length + 1).padStart(4, '0')}`;
}

// ─── POST /payment ─────────────────────────────────────────────────────
app.post('/payment', (req, res) => {
  const { from_user, to_service, amount, fee_gateway = 0, metadata } = req.body;
  log('POST', '/payment', `from=${from_user} amount=${amount}`);

  const respond = (data, delay = state.mockConfig.latency_ms || 0) => {
    setTimeout(() => res.json(data), delay);
  };

  // ── 1. Mock config override ─────────────────────────────────────
  if (state.mockConfig.force_error) {
    const forcedErrors = {
      'INSUFFICIENT_BALANCE': {
        status: 'FAILED', error_code: 'INSUFFICIENT_BALANCE',
        message: 'Saldo tidak mencukupi (mock forced).',
        required: amount + 1, available: 0,
      },
      'USER_NOT_FOUND': {
        status: 'FAILED', error_code: 'USER_NOT_FOUND',
        message: `User tidak ditemukan (mock forced).`,
      },
      'DAILY_LIMIT_EXCEEDED': {
        status: 'FAILED', error_code: 'DAILY_LIMIT_EXCEEDED',
        message: 'Daily limit tercapai (mock forced).',
        count_today: MAX_DAILY, limit: MAX_DAILY,
      },
      'COOLDOWN_ACTIVE': {
        status: 'FAILED', error_code: 'COOLDOWN_ACTIVE',
        message: 'Cooldown aktif (mock forced).', retry_after_seconds: COOLDOWN,
      },
      'SYSTEM_ERROR': null,
    };

    if (state.mockConfig.force_error === 'SYSTEM_ERROR') {
      return setTimeout(() => res.status(500).json({
        status: 'FAILED', error_code: 'SYSTEM_ERROR',
        message: 'SmartBank internal error (mock forced).',
      }), state.mockConfig.latency_ms || 0);
    }

    const errPayload = forcedErrors[state.mockConfig.force_error];
    if (errPayload) return respond(errPayload);
  }

  // ── 2. Validasi: user otomatis didaftarkan (khusus mock testing) ─────────────────────────────────
  if (!(from_user in state.balances)) {
    console.log(`[SmartBank] ⚠️ Auto-register user ${from_user} untuk keperluan testing.`);
    state.balances[from_user] = SALDO_AWAL;
  }

  // ── 3. Cek cooldown ─────────────────────────────────────────────
  const lastTxTime = getLastTransactionTime(from_user);
  if (lastTxTime) {
    const diffSeconds = (Date.now() - new Date(lastTxTime).getTime()) / 1000;
    if (diffSeconds < COOLDOWN) {
      const retryAfter = Math.ceil(COOLDOWN - diffSeconds);
      return respond({
        status: 'FAILED', error_code: 'COOLDOWN_ACTIVE',
        message: `Transaksi terlalu cepat. Tunggu ${retryAfter} detik lagi.`,
        retry_after_seconds: retryAfter,
      });
    }
  }

  // ── 4. Cek daily limit ──────────────────────────────────────────
  const countToday = countTodayTransactions(from_user);
  if (countToday >= MAX_DAILY) {
    return respond({
      status: 'FAILED', error_code: 'DAILY_LIMIT_EXCEEDED',
      message: `User ${from_user} telah mencapai batas ${MAX_DAILY} transaksi hari ini.`,
      count_today: countToday, limit: MAX_DAILY,
    });
  }

  // ── 5. Hitung total debit ────────────────────────────────────────
  const feeBank    = Math.floor(amount * FEE_BANK);
  const pajak      = Math.floor(amount * TAX);
  const totalDebit = amount + feeBank + pajak + fee_gateway;

  // ── 6. Validasi saldo ────────────────────────────────────────────
  if (state.balances[from_user] < totalDebit) {
    return respond({
      status: 'FAILED', error_code: 'INSUFFICIENT_BALANCE',
      message: `Saldo user ${from_user} tidak mencukupi.`,
      required: totalDebit, available: state.balances[from_user],
    });
  }

  // ── 7. Eksekusi transaksi ────────────────────────────────────────
  const txId      = generateTxId();
  const timestamp = new Date().toISOString();

  state.balances[from_user]                                  -= totalDebit;
  state.serviceAccounts[to_service]                           = (state.serviceAccounts[to_service] || 0) + amount;
  state.serviceAccounts['bank_reserve']                      += feeBank;
  state.serviceAccounts['gateway']                           += fee_gateway;
  // pajak → money sink (tidak ke akun manapun)

  // ── 8. Catat ke ledger ──────────────────────────────────────────
  const ledgerEntry = {
    id: state.ledger.length + 1,
    transaction_id: txId,
    timestamp,
    from_user,
    to_service: to_service || 'logistikita',
    amount,
    fee_bank:      feeBank,
    pajak_sistem:  pajak,
    fee_gateway,
    total_debit:   totalDebit,
    order_id:      metadata?.order_id || null,
    shipment_id:   metadata?.shipment_id || null,
    status:        'SUCCESS',
  };
  state.ledger.push(ledgerEntry);

  // ── 9. Catat ke riwayat user ─────────────────────────────────────
  if (!state.userTransactions[from_user]) {
    state.userTransactions[from_user] = [];
  }
  state.userTransactions[from_user].push({ timestamp, transaction_id: txId, amount });

  console.log(`[SmartBank] ✅ Transaksi sukses: ${txId} | ${from_user} debit Rp${totalDebit} | saldo baru: Rp${state.balances[from_user]}`);

  // ── 10. Return response ──────────────────────────────────────────
  return respond({
    status:         'SUCCESS',
    transaction_id: txId,
    timestamp,
    deducted_amounts: {
      pokok:        amount,
      fee_bank:     feeBank,
      pajak_sistem: pajak,
      fee_gateway,
      total_debit:  totalDebit,
    },
    new_balance: state.balances[from_user],
  });
});

// ─── GET /smartbank/balance/:user_id ─────────────────────────────────
app.get('/smartbank/balance/:user_id', (req, res) => {
  const { user_id } = req.params;
  log('GET', `/smartbank/balance/${user_id}`);

  if (!(user_id in state.balances)) {
    return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: `User ${user_id} tidak ditemukan.` } });
  }

  const txList  = state.userTransactions[user_id] || [];
  const today   = new Date().toDateString();
  const txToday = txList.filter(tx => new Date(tx.timestamp).toDateString() === today).length;

  res.json({
    user_id,
    balance:              state.balances[user_id],
    currency:             'IDR',
    transactions_today:   txToday,
    transactions_total:   txList.length,
    last_transaction:     txList.length ? txList[txList.length - 1].timestamp : null,
    history:              txList,
  });
});

// ─── GET /smartbank/ledger ────────────────────────────────────────────
app.get('/smartbank/ledger', (req, res) => {
  log('GET', '/smartbank/ledger');
  const limit = parseInt(req.query.limit) || 100;
  const ledger = state.ledger.slice(-limit).reverse();
  res.json({ total: state.ledger.length, ledger });
});

// ─── GET /smartbank/accounts ─────────────────────────────────────────
app.get('/smartbank/accounts', (req, res) => {
  log('GET', '/smartbank/accounts');
  const totalUsers    = Object.values(state.balances).reduce((a, b) => a + b, 0);
  const totalServices = Object.values(state.serviceAccounts).reduce((a, b) => a + b, 0);
  const moneySink     = state.ledger.reduce((sum, e) => sum + (e.pajak_sistem || 0), 0);

  res.json({
    users:              state.balances,
    service_accounts:   state.serviceAccounts,
    money_sink_total:   moneySink,
    total_in_accounts:  totalUsers + totalServices,
    transactions_count: state.ledger.length,
  });
});

// ─── POST /smartbank/topup ────────────────────────────────────────────
app.post('/smartbank/topup', (req, res) => {
  const { user_id, amount } = req.body;
  log('POST', '/smartbank/topup', `user=${user_id} amount=${amount}`);

  if (!user_id || !(user_id in state.balances)) {
    return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: `User ${user_id} tidak ditemukan.` } });
  }
  if (!amount || typeof amount !== 'number') {
    return res.status(400).json({ success: false, error: { code: 'INVALID_AMOUNT', message: 'Amount harus berupa angka.' } });
  }

  state.balances[user_id] += amount;
  res.json({
    message:     `Topup berhasil.`,
    user_id,
    amount_added: amount,
    new_balance:  state.balances[user_id],
  });
});

// ─── POST /smartbank/add-user ─────────────────────────────────────────
app.post('/smartbank/add-user', (req, res) => {
  const { user_id, initial_balance } = req.body;
  log('POST', '/smartbank/add-user', `user=${user_id}`);

  if (!user_id) {
    return res.status(400).json({ success: false, error: { code: 'MISSING_USER_ID', message: 'user_id wajib diisi.' } });
  }

  const balance = typeof initial_balance === 'number' ? initial_balance : SALDO_AWAL;
  state.balances[user_id] = balance;

  res.json({
    message:  `User ${user_id} berhasil ditambahkan.`,
    user_id,
    balance,
  });
});

// ─── POST /smartbank/reset ────────────────────────────────────────────
app.post('/smartbank/reset', (req, res) => {
  log('POST', '/smartbank/reset');
  state = JSON.parse(JSON.stringify(INITIAL_STATE));
  console.log('[SmartBank] 🔄 State direset ke kondisi awal.');
  res.json({
    message:       'SmartBank state direset ke kondisi awal.',
    users_reset:   Object.keys(state.balances),
    initial_balance: SALDO_AWAL,
  });
});

// ─── POST /mock/smartbank/config ──────────────────────────────────────
app.post('/mock/smartbank/config', (req, res) => {
  const { force_error, active, latency_ms } = req.body;
  log('POST', '/mock/smartbank/config', `force_error=${force_error} active=${active}`);

  state.mockConfig.force_error = (active === false || active === 'false') ? null : (force_error || null);
  if (typeof latency_ms === 'number') state.mockConfig.latency_ms = latency_ms;

  console.log(`[SmartBank] ⚙️  Mock config: force_error=${state.mockConfig.force_error}, latency=${state.mockConfig.latency_ms}ms`);
  res.json({
    message:        'Mock config updated.',
    current_config: state.mockConfig,
  });
});

// ─── GET /smartbank/health ────────────────────────────────────────────
app.get('/smartbank/health', (req, res) => {
  res.json({
    status:             'UP',
    service:            'Mock SmartBank',
    port:               PORT,
    users_count:        Object.keys(state.balances).length,
    transactions_total: state.ledger.length,
    mock_config:        state.mockConfig,
    timestamp:          new Date().toISOString(),
  });
});

// ─── 404 ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} tidak ditemukan di Mock SmartBank.` });
});

// ─── START ────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════╗`);
  console.log(`║   Mock SmartBank berjalan di :${PORT}  ║`);
  console.log(`╚══════════════════════════════════════╝`);
  console.log(`Users: ${Object.keys(INITIAL_STATE.balances).join(', ')} — Saldo awal: Rp${SALDO_AWAL.toLocaleString('id-ID')}/user\n`);
});
