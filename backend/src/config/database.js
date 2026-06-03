'use strict';

const mysql = require('mysql2/promise');
require('dotenv').config();

/** @type {mysql.Pool} */
let pool;

/**
 * Mendapatkan connection pool MySQL.
 * Pool dibuat sekali dan di-reuse.
 */
function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host:            process.env.DB_HOST     || 'localhost',
      port:            parseInt(process.env.DB_PORT) || 3306,
      user:            process.env.DB_USER     || 'logistikita_user',
      password:        process.env.DB_PASSWORD || 'secret',
      database:        process.env.DB_NAME     || 'logistikita_db',
      connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
      charset:         'utf8mb4',
      timezone:        'local',
      waitForConnections: true,
    });
    console.log('[DB] MySQL connection pool dibuat.');
  }
  return pool;
}

/**
 * Menjalankan query dengan parameter.
 * @param {string} sql
 * @param {Array}  params
 * @returns {Promise<[any, any]>}
 */
async function query(sql, params = []) {
  const db = getPool();
  return db.execute(sql, params);
}

/**
 * Mendapatkan satu koneksi dari pool (untuk transaksi manual).
 * @returns {Promise<mysql.PoolConnection>}
 */
async function getConnection() {
  return getPool().getConnection();
}

/**
 * Menguji koneksi ke database.
 */
async function testConnection() {
  try {
    const [rows] = await query('SELECT 1 AS ok');
    if (rows[0].ok === 1) {
      console.log('[DB] Koneksi ke MySQL berhasil.');
    }
  } catch (err) {
    console.error('[DB] Gagal terkoneksi ke MySQL:', err.message);
    throw err;
  }
}

/**
 * Inisialisasi database: buat tabel jika belum ada.
 * Dipanggil saat startup atau via script npm run db:init.
 */
async function initDB() {
  const db = getPool();

  const createUsers = `
    CREATE TABLE IF NOT EXISTS users (
      id         VARCHAR(36)  NOT NULL PRIMARY KEY,
      name       VARCHAR(100) NOT NULL,
      email      VARCHAR(150) NOT NULL UNIQUE,
      created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  const createShipments = `
    CREATE TABLE IF NOT EXISTS shipments (
      id               VARCHAR(36)  NOT NULL PRIMARY KEY,
      order_id         VARCHAR(100) NOT NULL UNIQUE,
      user_id          VARCHAR(36)  NOT NULL,
      source_app       ENUM('marketplace','supplierhub') NOT NULL,
      alamat_tujuan    TEXT         NOT NULL,
      jarak_km         DECIMAL(10,2) NOT NULL,
      nilai_transaksi  BIGINT       NOT NULL,
      ongkir           BIGINT       NOT NULL DEFAULT 0,
      fee_layanan      BIGINT       NOT NULL DEFAULT 0,
      total_biaya      BIGINT       NOT NULL DEFAULT 0,
      status           ENUM('PENDING','PROCESSING','SHIPPED','DELIVERED','FAILED') NOT NULL DEFAULT 'PENDING',
      transaction_id   VARCHAR(100) NULL,
      created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_shipments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
      INDEX idx_shipments_user_id (user_id),
      INDEX idx_shipments_status  (status),
      INDEX idx_shipments_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  const createTrackingLogs = `
    CREATE TABLE IF NOT EXISTS tracking_logs (
      id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      shipment_id VARCHAR(36)     NOT NULL,
      status      ENUM('PENDING','PROCESSING','SHIPPED','DELIVERED','FAILED') NOT NULL,
      keterangan  VARCHAR(255)    NULL,
      created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_tracking_shipment FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE ON UPDATE CASCADE,
      INDEX idx_tracking_shipment (shipment_id),
      INDEX idx_tracking_created  (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  const createTransactionLogs = `
    CREATE TABLE IF NOT EXISTS transaction_logs (
      id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      shipment_id         VARCHAR(36)     NOT NULL,
      order_id            VARCHAR(100)    NOT NULL,
      user_id             VARCHAR(36)     NOT NULL,
      amount              BIGINT          NOT NULL,
      ongkir              BIGINT          NOT NULL,
      fee_layanan         BIGINT          NOT NULL,
      payment_status      ENUM('SUCCESS','FAILED','PENDING') NOT NULL DEFAULT 'PENDING',
      transaction_id      VARCHAR(100)    NULL,
      error_code          VARCHAR(100)    NULL,
      error_message       TEXT            NULL,
      smartbank_payload   JSON            NULL,
      smartbank_response  JSON            NULL,
      created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_txlog_shipment FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE ON UPDATE CASCADE,
      INDEX idx_txlog_shipment (shipment_id),
      INDEX idx_txlog_user     (user_id),
      INDEX idx_txlog_status   (payment_status),
      INDEX idx_txlog_created  (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  await db.execute(createUsers);
  await db.execute(createShipments);
  await db.execute(createTrackingLogs);
  await db.execute(createTransactionLogs);

  console.log('[DB] Semua tabel berhasil diinisialisasi.');
}

module.exports = { query, getConnection, testConnection, initDB, getPool };
