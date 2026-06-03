-- ============================================================
-- DATABASE LOGISTIKITA — Schema Lengkap
-- Jalankan file ini untuk inisialisasi database dari awal.
-- Alternatif: gunakan `npm run db:init` yang otomatis membuat
-- tabel via src/config/database.js (CREATE TABLE IF NOT EXISTS).
-- ============================================================

CREATE DATABASE IF NOT EXISTS logistikita_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE logistikita_db;

-- ============================================================
-- TABEL: users
-- Referensi user dari ekosistem SmartBank.
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id          VARCHAR(36)   NOT NULL PRIMARY KEY,
  name        VARCHAR(100)  NOT NULL,
  email       VARCHAR(150)  NOT NULL UNIQUE,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABEL: shipments
-- Satu record per pengiriman. order_id bersifat UNIQUE.
-- ============================================================
CREATE TABLE IF NOT EXISTS shipments (
  id               VARCHAR(36)     NOT NULL PRIMARY KEY,
  order_id         VARCHAR(100)    NOT NULL UNIQUE,
  user_id          VARCHAR(36)     NOT NULL,
  source_app       ENUM('marketplace','supplierhub') NOT NULL,
  alamat_tujuan    TEXT            NOT NULL,
  jarak_km         DECIMAL(10,2)   NOT NULL,
  nilai_transaksi  BIGINT          NOT NULL,
  ongkir           BIGINT          NOT NULL DEFAULT 0,
  fee_layanan      BIGINT          NOT NULL DEFAULT 0,
  total_biaya      BIGINT          NOT NULL DEFAULT 0,
  status           ENUM('PENDING','PROCESSING','SHIPPED','DELIVERED','FAILED') NOT NULL DEFAULT 'PENDING',
  transaction_id   VARCHAR(100)    NULL,
  created_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_shipments_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  INDEX idx_shipments_user_id (user_id),
  INDEX idx_shipments_status  (status),
  INDEX idx_shipments_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABEL: tracking_logs
-- Riwayat perubahan status (append-only).
-- ============================================================
CREATE TABLE IF NOT EXISTS tracking_logs (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  shipment_id VARCHAR(36)     NOT NULL,
  status      ENUM('PENDING','PROCESSING','SHIPPED','DELIVERED','FAILED') NOT NULL,
  keterangan  VARCHAR(255)    NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_tracking_shipment
    FOREIGN KEY (shipment_id) REFERENCES shipments(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  INDEX idx_tracking_shipment (shipment_id),
  INDEX idx_tracking_created  (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABEL: transaction_logs
-- Audit trail semua percobaan pembayaran ke SmartBank.
-- ============================================================
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

  CONSTRAINT fk_txlog_shipment
    FOREIGN KEY (shipment_id) REFERENCES shipments(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  INDEX idx_txlog_shipment (shipment_id),
  INDEX idx_txlog_user     (user_id),
  INDEX idx_txlog_status   (payment_status),
  INDEX idx_txlog_created  (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- SEED: User awal untuk testing (sesuaikan jika perlu)
-- ============================================================
INSERT IGNORE INTO users (id, name, email) VALUES
  ('USR-001', 'Budi Santoso',    'budi@test.com'),
  ('USR-002', 'Siti Rahayu',     'siti@test.com'),
  ('USR-003', 'Ahmad Fauzi',     'ahmad@test.com'),
  ('USR-004', 'Dewi Lestari',    'dewi@test.com'),
  ('USR-005', 'Eko Prasetyo',    'eko@test.com');
