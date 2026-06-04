'use strict';

require('dotenv').config();
const express = require('express');
const axios   = require('axios');
const jwt     = require('jsonwebtoken');

const app  = express();
const PORT = parseInt(process.env.GATEWAY_PORT)   || 5000;
const SMARTBANK_URL  = process.env.SMARTBANK_BASE_URL || 'http://localhost:4000';
const FEE_GATEWAY    = parseFloat(process.env.FEE_GATEWAY_PERCENTAGE) || 0.005;
const JWT_SECRET     = process.env.JWT_SECRET;

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
const gatewayLogs = [];
let mockConfig = { force_error: null };

// ─── HELPERS ──────────────────────────────────────────────────────────
function log(method, path, extra = '') {
  console.log(`[${new Date().toISOString()}] [Gateway] ${method} ${path} ${extra}`);
}

function validateJWT(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return { valid: false, reason: 'MISSING' };
  const token = authHeader.split(' ')[1];
  if (token === process.env.GATEWAY_API_KEY) return { valid: true, decoded: { service: 'logistikita' } };
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { valid: true, decoded };
  } catch (err) {
    return { valid: false, reason: err.name === 'TokenExpiredError' ? 'EXPIRED' : 'INVALID' };
  }
}

function addLog(entry) {
  gatewayLogs.push({ id: gatewayLogs.length + 1, ...entry });
}

// ─── POST /logistics/pay ──────────────────────────────────────────────
app.post('/logistics/pay', async (req, res) => {
  log('POST', '/logistics/pay', `from=${req.body?.from_user} amount=${req.body?.amount}`);

  // ── Mock config override ──────────────────────────────────────────
  if (mockConfig.force_error === 'JWT_INVALID') {
    return res.status(401).json({ status: 'FAILED', error_code: 'INVALID_TOKEN', message: 'JWT tidak valid (mock forced).' });
  }
  if (mockConfig.force_error === 'GATEWAY_DOWN') {
    return res.status(503).json({ status: 'FAILED', error_code: 'GATEWAY_DOWN', message: 'Gateway tidak tersedia (mock forced).' });
  }
  if (mockConfig.force_error === 'GATEWAY_TIMEOUT') {
    // Tidak pernah respond — simulasi timeout
    return;
  }

  // ── Validasi JWT ─────────────────────────────────────────────────
  const jwtCheck = validateJWT(req.headers['authorization']);
  if (!jwtCheck.valid) {
    addLog({
      timestamp: new Date().toISOString(),
      method: 'POST', path: '/logistics/pay',
      from_app: req.body?.from_app, from_user: req.body?.from_user,
      amount: req.body?.amount, fee_gateway: 0,
      smartbank_response_status: 'JWT_REJECTED',
    });
    return res.status(401).json({
      status: 'FAILED',
      error_code: jwtCheck.reason === 'MISSING' ? 'MISSING_TOKEN' : 'INVALID_TOKEN',
      message: jwtCheck.reason === 'MISSING'
        ? 'Header Authorization tidak ditemukan.'
        : 'JWT token tidak valid atau sudah expired.',
    });
  }

  const { from_app, from_user, to_service, amount, metadata } = req.body;
  const feeGateway = Math.floor(amount * FEE_GATEWAY);

  const payloadToSmartBank = {
    from_app,
    from_user,
    to_service: to_service || 'logistikita',
    amount,
    fee_gateway: feeGateway,
    metadata,
  };

  let smartbankStatus = 'UNKNOWN';

  try {
    const response = await axios.post(
      `${SMARTBANK_URL}/payment`,
      payloadToSmartBank,
      { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
    );

    smartbankStatus = response.data?.status || 'UNKNOWN';

    addLog({
      timestamp: new Date().toISOString(),
      method: 'POST', path: '/logistics/pay',
      from_app, from_user, amount, fee_gateway: feeGateway,
      order_id: metadata?.order_id,
      smartbank_response_status: smartbankStatus,
    });

    console.log(`[Gateway] ✅ Forward selesai: ${from_user} Rp${amount} → SmartBank status: ${smartbankStatus} (fee_gateway: Rp${feeGateway})`);

    return res.json(response.data);

  } catch (err) {
    smartbankStatus = 'NETWORK_ERROR';

    addLog({
      timestamp: new Date().toISOString(),
      method: 'POST', path: '/logistics/pay',
      from_app, from_user, amount, fee_gateway: feeGateway,
      order_id: metadata?.order_id,
      smartbank_response_status: smartbankStatus,
      error: err.message,
    });

    console.error(`[Gateway] ❌ SmartBank tidak dapat dihubungi:`, err.message);

    return res.status(503).json({
      status: 'FAILED',
      error_code: 'SMARTBANK_UNREACHABLE',
      message: 'SmartBank tidak dapat dihubungi. Coba lagi nanti.',
    });
  }
});

// ─── GET /gateway/health ──────────────────────────────────────────────
app.get('/gateway/health', (req, res) => {
  res.json({
    status: 'UP', service: 'Mock API Gateway', port: PORT,
    smartbank_url: SMARTBANK_URL,
    fee_gateway_percentage: `${FEE_GATEWAY * 100}%`,
    mock_config: mockConfig,
    total_requests: gatewayLogs.length,
    timestamp: new Date().toISOString(),
  });
});

// ─── GET /gateway/logs ────────────────────────────────────────────────
app.get('/gateway/logs', (req, res) => {
  log('GET', '/gateway/logs');
  const limit = parseInt(req.query.limit) || 50;
  const logs  = gatewayLogs.slice(-limit).reverse();
  res.json({ total: gatewayLogs.length, logs });
});

// ─── POST /gateway/reset ──────────────────────────────────────────────
app.post('/gateway/reset', (req, res) => {
  log('POST', '/gateway/reset');
  gatewayLogs.length = 0;
  mockConfig = { force_error: null };
  console.log('[Gateway] 🔄 Logs dan mock config direset.');
  res.json({ message: 'Gateway logs dan mock config cleared.' });
});

// ─── POST /mock/gateway/config ────────────────────────────────────────
app.post('/mock/gateway/config', (req, res) => {
  const { force_error, active } = req.body;
  log('POST', '/mock/gateway/config', `force_error=${force_error} active=${active}`);

  mockConfig.force_error = (active === false || active === 'false') ? null : (force_error || null);

  console.log(`[Gateway] ⚙️  Mock config: force_error=${mockConfig.force_error}`);
  res.json({ message: 'Gateway mock config updated.', current_config: mockConfig });
});

// ─── 404 ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} tidak ditemukan di Mock Gateway.` });
});

// ─── START ────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════╗`);
  console.log(`║   Mock API Gateway berjalan di :${PORT} ║`);
  console.log(`╚══════════════════════════════════════╝`);
  console.log(`SmartBank URL: ${SMARTBANK_URL}`);
  console.log(`Fee Gateway  : ${FEE_GATEWAY * 100}%\n`);
});
