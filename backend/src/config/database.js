'use strict';

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
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
      multipleStatements: true, // Allow multiple statements for initDB
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
  return db.query(sql, params);
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
 * Inisialisasi database: jalankan schema.sql.
 * Dipanggil saat startup atau via script npm run db:init.
 */
async function initDB() {
  const db = getPool();
  try {
    const schemaPath = path.join(__dirname, '../../db/schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    
    await db.query(sql);
    console.log('[DB] Semua tabel berhasil diinisialisasi dari schema.sql.');
  } catch (err) {
    console.error('[DB] Gagal menginisialisasi database:', err.message);
  }
}

module.exports = { query, getConnection, testConnection, initDB, getPool };
