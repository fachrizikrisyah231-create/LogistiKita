'use strict';

require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');

const logistikitaRoutes = require('./routes/logistikitaRoutes');
const respond           = require('./utils/responseHelper');
const logger            = require('./utils/logger');
const { testConnection, initDB } = require('./config/database');

const app  = express();
const PORT = parseInt(process.env.PORT) || 3001;

// ─────────────────────────────────────────────────────────────────────
// MIDDLEWARE GLOBAL
// ─────────────────────────────────────────────────────────────────────
app.use(helmet());                    // Security headers
app.use(cors());                      // CORS (semua origin — batasi di produksi)
app.use(express.json());              // Parse JSON body
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));             // HTTP request logger
}

// ─────────────────────────────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status:  'UP',
    service: 'LogistiKita Backend',
    version: '1.0.0',
    port:    PORT,
    timestamp: new Date().toISOString(),
  });
});

// ─────────────────────────────────────────────────────────────────────
// ROUTES LOGISTIKITA
// ─────────────────────────────────────────────────────────────────────
app.use('/logistikita', logistikitaRoutes);

// ─────────────────────────────────────────────────────────────────────
// 404 HANDLER — route tidak ditemukan
// ─────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  respond.error(res, 'NOT_FOUND', `Route ${req.method} ${req.path} tidak ditemukan.`, 404);
});

// ─────────────────────────────────────────────────────────────────────
// GLOBAL ERROR HANDLER
// ─────────────────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.error('[Unhandled Error]', err.message, err.stack);
  respond.error(res, 'INTERNAL_ERROR', 'Terjadi kesalahan internal. Silakan coba lagi.', 500);
});

// ─────────────────────────────────────────────────────────────────────
// STARTUP
// ─────────────────────────────────────────────────────────────────────
async function start() {
  try {
    // Uji koneksi ke MySQL
    await testConnection();

    // Inisialisasi tabel (CREATE IF NOT EXISTS)
    await initDB();

    // Jalankan server
    app.listen(PORT, () => {
      logger.info(`[App] LogistiKita Backend berjalan di http://localhost:${PORT}`);
      logger.info(`[App] Mode: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    logger.error('[App] Gagal start server:', err.message);
    process.exit(1);
  }
}

start();

module.exports = app; // Untuk testing
