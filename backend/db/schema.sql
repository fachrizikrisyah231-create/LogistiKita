-- ============================================================
-- DATABASE LOGISTIKITA — Schema Lengkap v2
-- Jalankan file ini untuk inisialisasi database dari awal.
-- ============================================================

CREATE DATABASE IF NOT EXISTS logistikita_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE logistikita_db;

-- ============================================================
-- TABEL: users
-- Menyimpan data semua user (customer, kurir, admin).
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id          VARCHAR(36)   NOT NULL PRIMARY KEY,
  name        VARCHAR(100)  NOT NULL,
  email       VARCHAR(150)  NOT NULL UNIQUE,
  password    VARCHAR(255)  NOT NULL,
  role        ENUM('customer', 'kurir', 'admin') NOT NULL DEFAULT 'customer',
  branch_id   VARCHAR(36)   NULL,
  is_active   BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_users_role  (role),
  INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABEL: branches
-- Daftar cabang logistik sebagai checkpoint tracking.
-- ============================================================
CREATE TABLE IF NOT EXISTS branches (
  id          VARCHAR(36)   NOT NULL PRIMARY KEY,
  name        VARCHAR(100)  NOT NULL,
  city        VARCHAR(100)  NOT NULL,
  latitude    DECIMAL(10,7) NOT NULL,
  longitude   DECIMAL(10,7) NOT NULL,
  route_order INT           NOT NULL,
  is_active   BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_branches_order (route_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABEL: shipments
-- Satu record per pengiriman. order_id bersifat UNIQUE.
-- ============================================================
CREATE TABLE IF NOT EXISTS shipments (
  id                    VARCHAR(36)     NOT NULL PRIMARY KEY,
  order_id              VARCHAR(100)    NOT NULL UNIQUE,
  user_id               VARCHAR(36)     NOT NULL,
  source_app            ENUM('marketplace', 'supplierhub', 'direct') NOT NULL DEFAULT 'direct',
  tipe_pengiriman       ENUM('reguler', 'nextday', 'sameday') NOT NULL DEFAULT 'reguler',

  -- Alamat & Koordinat
  alamat_asal           TEXT            NULL,
  lat_asal              DECIMAL(10,7)   NULL,
  lng_asal              DECIMAL(10,7)   NULL,
  alamat_tujuan         TEXT            NOT NULL,
  lat_tujuan            DECIMAL(10,7)   NULL,
  lng_tujuan            DECIMAL(10,7)   NULL,

  -- Jarak & Biaya
  jarak_km              DECIMAL(10,2)   NOT NULL,
  nilai_transaksi       BIGINT          NULL,
  ongkir                BIGINT          NOT NULL DEFAULT 0,
  fee_layanan           BIGINT          NOT NULL DEFAULT 0,
  total_biaya           BIGINT          NOT NULL DEFAULT 0,

  -- Status & Tracking
  status                ENUM(
                          'PENDING',
                          'PICKUP',
                          'IN_TRANSIT',
                          'AT_BRANCH',
                          'OUT_FOR_DELIVERY',
                          'DELIVERED',
                          'FAILED'
                        ) NOT NULL DEFAULT 'PENDING',

  -- Referensi
  origin_branch_id      VARCHAR(36)     NULL,
  destination_branch_id VARCHAR(36)     NULL,
  current_branch_id     VARCHAR(36)     NULL,
  assigned_kurir_id     VARCHAR(36)     NULL,
  transaction_id        VARCHAR(100)    NULL,

  created_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_shipments_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_shipments_origin_branch FOREIGN KEY (origin_branch_id) REFERENCES branches(id),
  CONSTRAINT fk_shipments_dest_branch FOREIGN KEY (destination_branch_id) REFERENCES branches(id),
  CONSTRAINT fk_shipments_current_branch FOREIGN KEY (current_branch_id) REFERENCES branches(id),
  CONSTRAINT fk_shipments_kurir FOREIGN KEY (assigned_kurir_id) REFERENCES users(id),

  INDEX idx_shipments_user_id  (user_id),
  INDEX idx_shipments_status   (status),
  INDEX idx_shipments_created  (created_at),
  INDEX idx_shipments_kurir    (assigned_kurir_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABEL: shipment_routes
-- Rute cabang yang dilalui setiap pengiriman.
-- ============================================================
CREATE TABLE IF NOT EXISTS shipment_routes (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  shipment_id   VARCHAR(36)     NOT NULL,
  branch_id     VARCHAR(36)     NOT NULL,
  sequence      INT             NOT NULL,
  arrived_at    DATETIME        NULL,
  departed_at   DATETIME        NULL,

  CONSTRAINT fk_route_shipment FOREIGN KEY (shipment_id) REFERENCES shipments(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_route_branch FOREIGN KEY (branch_id) REFERENCES branches(id),

  INDEX idx_route_shipment (shipment_id),
  INDEX idx_route_sequence (shipment_id, sequence)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABEL: tracking_logs
-- Riwayat perubahan status pengiriman (append-only).
-- ============================================================
CREATE TABLE IF NOT EXISTS tracking_logs (
  id            BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT PRIMARY KEY,
  shipment_id   VARCHAR(36)       NOT NULL,
  status        ENUM(
                  'PENDING',
                  'PICKUP',
                  'IN_TRANSIT',
                  'AT_BRANCH',
                  'OUT_FOR_DELIVERY',
                  'DELIVERED',
                  'FAILED'
                ) NOT NULL,
  keterangan    VARCHAR(255)      NULL,
  branch_id     VARCHAR(36)       NULL,
  created_at    DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_tracking_shipment FOREIGN KEY (shipment_id) REFERENCES shipments(id)
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
  payment_status      ENUM('SUCCESS', 'FAILED', 'PENDING') NOT NULL DEFAULT 'PENDING',
  transaction_id      VARCHAR(100)    NULL,
  error_code          VARCHAR(100)    NULL,
  error_message       TEXT            NULL,
  smartbank_payload   JSON            NULL,
  smartbank_response  JSON            NULL,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_txlog_shipment FOREIGN KEY (shipment_id) REFERENCES shipments(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  INDEX idx_txlog_shipment (shipment_id),
  INDEX idx_txlog_user     (user_id),
  INDEX idx_txlog_status   (payment_status),
  INDEX idx_txlog_created  (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- SEED: Cabang Logistik (8 cabang Pulau Jawa)
-- ============================================================
INSERT IGNORE INTO branches (id, name, city, latitude, longitude, route_order) VALUES
  ('BRC-001', 'Cabang Jakarta',    'Jakarta',    -6.2088000, 106.8456000, 1),
  ('BRC-002', 'Cabang Bogor',      'Bogor',      -6.5971000, 106.8060000, 2),
  ('BRC-003', 'Cabang Bandung',    'Bandung',    -6.9175000, 107.6191000, 3),
  ('BRC-004', 'Cabang Cirebon',    'Cirebon',    -6.7320000, 108.5523000, 4),
  ('BRC-005', 'Cabang Semarang',   'Semarang',   -6.9666000, 110.4196000, 5),
  ('BRC-006', 'Cabang Yogyakarta', 'Yogyakarta', -7.7956000, 110.3695000, 6),
  ('BRC-007', 'Cabang Surabaya',   'Surabaya',   -7.2575000, 112.7521000, 7),
  ('BRC-008', 'Cabang Malang',     'Malang',     -7.9786000, 112.6304000, 8);

-- ============================================================
-- SEED: Users (password: password123)
-- Hash bcrypt dihasilkan saat runtime oleh setup.sql / initDB.
-- Placeholder hash di bawah ini valid bcrypt untuk 'password123'.
-- ============================================================
INSERT IGNORE INTO users (id, name, email, password, role) VALUES
  ('USR-001', 'Ahmad Pembeli', 'ahmad@test.com', '$2b$10$PqCsec914BE2RHOBjyGzyugiIWfXVuORhFawd.3//nsNFQuY/g/L.', 'customer'),
  ('USR-002', 'Budi Pembeli',  'budi@test.com',  '$2b$10$PqCsec914BE2RHOBjyGzyugiIWfXVuORhFawd.3//nsNFQuY/g/L.', 'customer'),
  ('USR-003', 'Citra Pembeli', 'citra@test.com', '$2b$10$PqCsec914BE2RHOBjyGzyugiIWfXVuORhFawd.3//nsNFQuY/g/L.', 'customer'),
  ('USR-004', 'Deni Kurir',    'deni@test.com',  '$2b$10$PqCsec914BE2RHOBjyGzyugiIWfXVuORhFawd.3//nsNFQuY/g/L.', 'kurir'),
  ('USR-005', 'Eka Kurir',     'eka@test.com',   '$2b$10$PqCsec914BE2RHOBjyGzyugiIWfXVuORhFawd.3//nsNFQuY/g/L.', 'kurir'),
  ('USR-006', 'Hadi Admin',    'hadi@test.com',  '$2b$10$PqCsec914BE2RHOBjyGzyugiIWfXVuORhFawd.3//nsNFQuY/g/L.', 'admin');
