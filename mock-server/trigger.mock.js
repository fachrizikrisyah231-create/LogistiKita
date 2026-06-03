'use strict';

require('dotenv').config();
const express = require('express');
const axios   = require('axios');
const jwt     = require('jsonwebtoken');

const app  = express();
const PORT = parseInt(process.env.TRIGGER_PORT)     || 5500;
const LOGISTIKITA_URL = process.env.LOGISTIKITA_BASE_URL || 'http://localhost:3001';
const JWT_SECRET      = process.env.JWT_SECRET;

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

// ─── HELPERS ──────────────────────────────────────────────────────────
function log(method, path, extra = '') {
  console.log(`[${new Date().toISOString()}] [Trigger] ${method} ${path} ${extra}`);
}

/**
 * Generate JWT token valid untuk user tertentu.
 * Token ini dapat digunakan langsung sebagai Bearer token ke backend.
 */
function generateToken(userId) {
  return jwt.sign(
    { user_id: userId, email: `${userId.toLowerCase()}@test.com` },
    JWT_SECRET,
    { expiresIn: '2h' }
  );
}

/**
 * Mengirim request ke LogistiKita backend dengan JWT yang di-generate otomatis.
 */
async function sendToLogistikita(body, sourceApp) {
  const token = generateToken(body.user_id);
  const payload = { ...body, source_app: sourceApp };

  return axios.post(
    `${LOGISTIKITA_URL}/logistikita/request_pengiriman`,
    payload,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
      },
      timeout: 20000,
      validateStatus: () => true, // Jangan throw untuk 4xx/5xx — kita teruskan apa adanya
    }
  );
}

// ─── POST /trigger/marketplace ────────────────────────────────────────
app.post('/trigger/marketplace', async (req, res) => {
  log('POST', '/trigger/marketplace', `order=${req.body?.order_id} user=${req.body?.user_id}`);

  const { order_id, user_id, alamat_tujuan, jarak, nilai_transaksi } = req.body;

  // Validasi minimal
  if (!order_id || !user_id || !alamat_tujuan || !jarak || !nilai_transaksi) {
    return res.status(400).json({
      success: false,
      error: {
        code:    'MISSING_FIELDS',
        message: 'Field yang wajib: order_id, user_id, alamat_tujuan, jarak, nilai_transaksi.',
      },
    });
  }

  try {
    const response = await sendToLogistikita(req.body, 'marketplace');
    console.log(`[Trigger] Marketplace → LogistiKita: ${response.status} | order=${order_id}`);

    return res.status(response.status).json({
      triggered_by:       'mock-marketplace',
      order_id,
      user_id,
      logistikita_response: response.data,
    });
  } catch (err) {
    console.error(`[Trigger] Marketplace: LogistiKita tidak dapat dihubungi —`, err.message);
    return res.status(503).json({
      success: false,
      error: { code: 'LOGISTIKITA_UNREACHABLE', message: `LogistiKita tidak dapat dihubungi: ${err.message}` },
    });
  }
});

// ─── POST /trigger/supplierhub ────────────────────────────────────────
app.post('/trigger/supplierhub', async (req, res) => {
  log('POST', '/trigger/supplierhub', `order=${req.body?.order_id} user=${req.body?.user_id}`);

  const { order_id, user_id, alamat_tujuan, jarak, nilai_transaksi } = req.body;

  if (!order_id || !user_id || !alamat_tujuan || !jarak || !nilai_transaksi) {
    return res.status(400).json({
      success: false,
      error: {
        code:    'MISSING_FIELDS',
        message: 'Field yang wajib: order_id, user_id, alamat_tujuan, jarak, nilai_transaksi.',
      },
    });
  }

  try {
    const response = await sendToLogistikita(req.body, 'supplierhub');
    console.log(`[Trigger] SupplierHub → LogistiKita: ${response.status} | order=${order_id}`);

    return res.status(response.status).json({
      triggered_by:       'mock-supplierhub',
      order_id,
      user_id,
      logistikita_response: response.data,
    });
  } catch (err) {
    console.error(`[Trigger] SupplierHub: LogistiKita tidak dapat dihubungi —`, err.message);
    return res.status(503).json({
      success: false,
      error: { code: 'LOGISTIKITA_UNREACHABLE', message: `LogistiKita tidak dapat dihubungi: ${err.message}` },
    });
  }
});

// ─── POST /trigger/batch ──────────────────────────────────────────────
app.post('/trigger/batch', async (req, res) => {
  const {
    count = 3,
    source_app = 'marketplace',
    base_order_id = 'ORD-BATCH',
    delay_between_ms = 11000, // default 11 detik — melewati cooldown 10 detik
    ...rest
  } = req.body;

  log('POST', '/trigger/batch', `count=${count} source=${source_app} base=${base_order_id}`);

  const results = [];

  for (let i = 1; i <= count; i++) {
    const orderId = `${base_order_id}-${String(i).padStart(3, '0')}`;

    try {
      const response = await sendToLogistikita({ ...rest, order_id: orderId }, source_app);
      const resData  = response.data;
      results.push({
        order_id: orderId,
        http_status: response.status,
        success: resData?.success || false,
        status:  resData?.data?.status || null,
        error:   resData?.error?.code  || null,
      });
      console.log(`[Trigger] Batch [${i}/${count}] ${orderId}: ${response.status}`);
    } catch (err) {
      results.push({ order_id: orderId, success: false, error: 'NETWORK_ERROR' });
    }

    // Tunggu antar request agar tidak kena cooldown (kecuali request terakhir)
    if (i < count && delay_between_ms > 0) {
      await new Promise(r => setTimeout(r, delay_between_ms));
    }
  }

  res.json({
    total_sent:  count,
    source_app,
    base_order_id,
    results,
  });
});

// ─── GET /trigger/generate-token ──────────────────────────────────────
app.get('/trigger/generate-token', (req, res) => {
  const { user_id = 'USR-001' } = req.query;
  log('GET', '/trigger/generate-token', `user=${user_id}`);

  const token = generateToken(user_id);
  res.json({
    user_id,
    token,
    expires_in: '2h',
    usage:      `Authorization: Bearer ${token}`,
  });
});

// ─── GET /trigger/health ──────────────────────────────────────────────
app.get('/trigger/health', (req, res) => {
  res.json({
    status:          'UP',
    service:         'Mock Trigger (Marketplace & SupplierHub)',
    port:            PORT,
    logistikita_url: LOGISTIKITA_URL,
    timestamp:       new Date().toISOString(),
  });
});

// ─── 404 ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} tidak ditemukan di Mock Trigger.` });
});

// ─── START ────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════╗`);
  console.log(`║   Mock Trigger berjalan di    :${PORT}  ║`);
  console.log(`╚══════════════════════════════════════╝`);
  console.log(`LogistiKita URL: ${LOGISTIKITA_URL}\n`);
});
