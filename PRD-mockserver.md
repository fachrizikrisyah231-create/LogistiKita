# PRD Mock Server — LogistiKita

> **Dokumen:** Product Requirements Document (Mock Server)
> **Proyek:** LogistiKita — Aplikasi Manajemen Pengiriman Barang
> **Mata Kuliah:** Rekayasa Perangkat Lunak 2
> **Stack:** Node.js + Express.js (standalone, tanpa database)
> **Versi:** 1.0.0 | Tanggal: 2026-06-03

---

## Daftar Isi

1. [Overview & Tujuan](#1-overview--tujuan)
2. [Arsitektur Mock Server](#2-arsitektur-mock-server)
3. [Struktur Direktori](#3-struktur-direktori)
4. [Environment & Konfigurasi](#4-environment--konfigurasi)
5. [Mock Gateway — Spesifikasi Lengkap](#5-mock-gateway--spesifikasi-lengkap)
6. [Mock SmartBank — Spesifikasi Lengkap](#6-mock-smartbank--spesifikasi-lengkap)
7. [Mock Marketplace & SupplierHub Trigger](#7-mock-marketplace--supplierhub-trigger)
8. [Skenario Test & Simulasi](#8-skenario-test--simulasi)
9. [State Management In-Memory](#9-state-management-in-memory)
10. [Implementasi Kode Lengkap](#10-implementasi-kode-lengkap)
11. [Cara Menjalankan](#11-cara-menjalankan)
12. [Acceptance Criteria](#12-acceptance-criteria)

---

## 1. Overview & Tujuan

Mock server adalah **pengganti sementara** untuk layanan eksternal yang belum tersedia atau belum terintegrasi selama fase development dan testing LogistiKita. Terdapat **tiga komponen** mock yang perlu dibangun:

| Komponen | Port | Menggantikan | Dipakai Oleh |
|---|---|---|---|
| **Mock API Gateway** | `5000` | API Gateway (Integrator) | LogistiKita Backend |
| **Mock SmartBank** | `4000` | SmartBank (Core) | Mock API Gateway |
| **Mock Trigger** | `5500` | Marketplace / SupplierHub | Developer / Testing |

### Mengapa Mock Server Diperlukan?

1. **Independensi Development** — Backend LogistiKita dapat dikembangkan dan diuji tanpa bergantung pada ketersediaan SmartBank atau API Gateway yang dikerjakan kelompok lain.
2. **Kontrol Skenario** — Developer dapat mensimulasikan berbagai kondisi: saldo cukup, saldo kurang, SmartBank down, rate limit tercapai, dll.
3. **Repeatability** — State dapat di-reset kapan saja untuk pengujian yang konsisten dan reproducible.
4. **Speed** — Tidak ada network latency ke service nyata; testing berjalan lebih cepat.

### Prinsip Mock Server

- **In-memory state** — Data disimpan di variabel JavaScript (array/object), tidak menggunakan database.
- **Stateful** — Mock SmartBank menyimpan saldo user dan ledger transaksi selama proses berjalan.
- **Resettable** — Ada endpoint `POST /reset` untuk mereset state ke kondisi awal.
- **Configurable responses** — Ada endpoint `POST /mock/config` untuk memaksa respons tertentu (misal: selalu gagal).
- **Logging** — Setiap request masuk di-log ke console untuk debugging.

---

## 2. Arsitektur Mock Server

```
┌─────────────────────────────────────────────────────────┐
│                DEVELOPER / TEST SCRIPT                  │
│   POST /trigger/marketplace  →  Mock Trigger (5500)     │
└───────────────────────┬─────────────────────────────────┘
                        │ POST /logistikita/request_pengiriman
                        ▼
┌─────────────────────────────────────────────────────────┐
│         LOGISTIKITA BACKEND (3001)  ← real service      │
└───────────────────────┬─────────────────────────────────┘
                        │ POST /logistics/pay
                        ▼
┌─────────────────────────────────────────────────────────┐
│           MOCK API GATEWAY (5000)                       │
│  1. Validasi JWT (format check)                         │
│  2. Log request                                         │
│  3. Hitung & catat fee gateway (0.5%)                   │
│  4. Forward ke Mock SmartBank                           │
└───────────────────────┬─────────────────────────────────┘
                        │ POST /payment
                        ▼
┌─────────────────────────────────────────────────────────┐
│           MOCK SMARTBANK (4000)                         │
│  1. Validasi user exists                                │
│  2. Validasi cooldown (10 detik)                        │
│  3. Validasi daily limit (10 tx/hari)                   │
│  4. Validasi saldo mencukupi                            │
│  5. Debit saldo user                                    │
│  6. Kredit akun LogistiKita                             │
│  7. Catat fee bank (1%) + pajak (2%)                    │
│  8. Catat ke ledger in-memory                           │
│  9. Return response                                     │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Struktur Direktori

```
mock-server/
├── gateway.mock.js         # Mock API Gateway (port 5000)
├── smartbank.mock.js       # Mock SmartBank (port 4000)
├── trigger.mock.js         # Mock Trigger: Marketplace & SupplierHub (port 5500)
├── data/
│   └── seed.js             # Data awal: users + saldo awal
├── utils/
│   ├── jwtHelper.js        # Generate & verify JWT untuk testing
│   ├── logger.js           # Logging ke console dengan timestamp
│   └── idGenerator.js      # Generate ID untuk transaksi mock
├── package.json
├── .env
└── README-mock.md          # Panduan cepat cara menjalankan
```

---

## 4. Environment & Konfigurasi

### `mock-server/.env`

```env
# ─── Ports ────────────────────────────────────────────────────
GATEWAY_PORT=5000
SMARTBANK_PORT=4000
TRIGGER_PORT=5500

# ─── Target Service ───────────────────────────────────────────
LOGISTIKITA_BASE_URL=http://localhost:3001
SMARTBANK_BASE_URL=http://localhost:4000

# ─── Auth ─────────────────────────────────────────────────────
JWT_SECRET=your_jwt_secret_key_min_32_chars     # Harus sama dengan backend
GATEWAY_API_KEY=gateway_service_key

# ─── Aturan Keuangan (harus sinkron dengan backend) ───────────
SALDO_AWAL_USER=50000           # Rp50.000 per user baru
FEE_GATEWAY_PERCENTAGE=0.005    # 0.5%
FEE_BANK_PERCENTAGE=0.01        # 1%
TAX_PERCENTAGE=0.02             # 2%
COOLDOWN_SECONDS=10             # Cooldown antar transaksi
MAX_DAILY_TRANSACTIONS=10       # Maks tx/user/hari

# ─── Mock Behavior ────────────────────────────────────────────
SIMULATE_LATENCY_MS=200         # Simulasi network latency (ms)
```

---

## 5. Mock Gateway — Spesifikasi Lengkap

**File:** `mock-server/gateway.mock.js`
**Port:** `5000`
**Peran:** Menerima request dari LogistiKita backend, memvalidasi JWT, menghitung fee gateway, meneruskan ke Mock SmartBank.

### 5.1 Endpoint Mock Gateway

#### `POST /logistics/pay`

Endpoint utama. Menerima payment request dari LogistiKita dan meneruskan ke SmartBank.

**Request dari LogistiKita:**
```http
POST http://localhost:5000/logistics/pay
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

```json
{
  "from_app": "logistikita",
  "from_user": "USR-001",
  "to_service": "logistikita",
  "amount": 7875,
  "metadata": {
    "order_id": "ORD-20240601-0001",
    "shipment_id": "SHIP-20240601-0001",
    "type": "ongkir",
    "breakdown": {
      "ongkir": 7500,
      "fee_layanan_logistik": 375
    }
  }
}
```

**Proses internal Gateway:**
1. Validasi header `Authorization: Bearer <token>` — cek format & signature JWT
2. Log request masuk ke console
3. Hitung `fee_gateway = FLOOR(amount × 0.5%)`
4. Forward payload ke Mock SmartBank dengan `fee_gateway` ditambahkan
5. Teruskan response SmartBank ke LogistiKita

**Payload yang diteruskan ke SmartBank:**
```json
{
  "from_app": "logistikita",
  "from_user": "USR-001",
  "to_service": "logistikita",
  "amount": 7875,
  "fee_gateway": 39,
  "metadata": {
    "order_id": "ORD-20240601-0001",
    "shipment_id": "SHIP-20240601-0001",
    "type": "ongkir",
    "breakdown": {
      "ongkir": 7500,
      "fee_layanan_logistik": 375
    }
  }
}
```

**Response sukses (diteruskan dari SmartBank):**
```json
{
  "status": "SUCCESS",
  "transaction_id": "TRX-SBANK-9981",
  "timestamp": "2024-06-01T09:01:05Z",
  "deducted_amounts": {
    "pokok": 7875,
    "fee_bank": 79,
    "pajak_sistem": 157,
    "fee_gateway": 39,
    "total_debit": 8150
  },
  "new_balance": 41850
}
```

**Response gagal JWT (401):**
```json
{
  "status": "FAILED",
  "error_code": "INVALID_TOKEN",
  "message": "JWT token tidak valid atau sudah expired."
}
```

---

#### `GET /gateway/health`

Health check endpoint untuk memastikan mock gateway berjalan.

```json
{
  "status": "UP",
  "service": "Mock API Gateway",
  "port": 5000,
  "timestamp": "2024-06-01T09:00:00Z"
}
```

---

#### `GET /gateway/logs`

Menampilkan log semua request yang masuk ke gateway (untuk debugging).

```json
{
  "total": 3,
  "logs": [
    {
      "id": 1,
      "timestamp": "2024-06-01T09:01:00Z",
      "method": "POST",
      "path": "/logistics/pay",
      "from_app": "logistikita",
      "amount": 7875,
      "fee_gateway": 39,
      "smartbank_response_status": "SUCCESS"
    }
  ]
}
```

---

#### `POST /gateway/reset`

Mereset log gateway ke kondisi kosong.

```json
{ "message": "Gateway logs cleared." }
```

---

#### `POST /mock/gateway/config`

Memaksa gateway mengembalikan respons tertentu untuk keperluan testing error path.

**Request:**
```json
{
  "force_error": "JWT_INVALID",
  "active": true
}
```

| `force_error` | Efek |
|---|---|
| `null` | Perilaku normal |
| `"JWT_INVALID"` | Selalu mengembalikan 401 JWT error |
| `"GATEWAY_TIMEOUT"` | Simulasi gateway timeout (tidak ada response) |
| `"GATEWAY_DOWN"` | Selalu mengembalikan 503 |

---

### 5.2 Logika JWT Validation di Gateway

Mock Gateway **hanya memvalidasi format dan signature** JWT, bukan konteks bisnis (user_id, dsb.). Validasi cukup menggunakan `jwt.verify()` dengan secret yang sama.

```javascript
// Contoh validasi di gateway.mock.js
function validateJWT(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  const token = authHeader.split(' ')[1];
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}
```

---

## 6. Mock SmartBank — Spesifikasi Lengkap

**File:** `mock-server/smartbank.mock.js`
**Port:** `4000`
**Peran:** Mengelola saldo user in-memory, memvalidasi transaksi, mencatat ledger, mengembalikan response pembayaran.

### 6.1 State In-Memory SmartBank

```javascript
// State awal saat server start
const state = {
  // Saldo setiap user (key: user_id, value: saldo dalam Rupiah)
  balances: {
    'USR-001': 50000,
    'USR-002': 50000,
    'USR-003': 50000,
    'USR-004': 50000,
    'USR-005': 50000,
  },

  // Akun layanan
  serviceAccounts: {
    'logistikita': 0,    // Akun penerima pembayaran LogistiKita
    'gateway':     0,    // Akun penerima fee gateway
    'bank_reserve': 0,   // Reserve SmartBank (fee bank)
  },

  // Ledger semua transaksi
  ledger: [],

  // Riwayat transaksi per user (untuk cek daily limit & cooldown)
  userTransactions: {
    // 'USR-001': [{ timestamp, transaction_id, amount }]
  },

  // Konfigurasi mock behavior
  mockConfig: {
    force_error: null,      // null | 'INSUFFICIENT_BALANCE' | 'SYSTEM_ERROR' | dll.
    latency_ms: 200,
  }
};
```

---

### 6.2 Endpoint Mock SmartBank

#### `POST /payment`

Endpoint utama. Menerima payment request dari Mock Gateway (diteruskan dari LogistiKita).

**Request dari Mock Gateway:**
```http
POST http://localhost:4000/payment
Content-Type: application/json
```

```json
{
  "from_app": "logistikita",
  "from_user": "USR-001",
  "to_service": "logistikita",
  "amount": 7875,
  "fee_gateway": 39,
  "metadata": {
    "order_id": "ORD-20240601-0001",
    "shipment_id": "SHIP-20240601-0001",
    "type": "ongkir",
    "breakdown": {
      "ongkir": 7500,
      "fee_layanan_logistik": 375
    }
  }
}
```

**Proses Internal SmartBank (urutan wajib):**

```
1. Cek mock config → jika force_error aktif, langsung return error
2. Validasi from_user ada di state.balances
3. Cek cooldown: apakah transaksi terakhir user < 10 detik yang lalu?
4. Cek daily limit: apakah transaksi hari ini user sudah >= 10?
5. Hitung total debit:
     fee_bank    = FLOOR(amount × 1%)
     pajak       = FLOOR(amount × 2%)
     total_debit = amount + fee_bank + pajak + fee_gateway
6. Validasi saldo: balances[from_user] >= total_debit
7. Eksekusi:
     balances[from_user]            -= total_debit
     serviceAccounts[to_service]    += amount
     serviceAccounts['bank_reserve'] += fee_bank
     serviceAccounts['gateway']     += fee_gateway
     (pajak tidak ke mana-mana → money sink)
8. Generate transaction_id
9. Catat ke ledger
10. Catat ke userTransactions[from_user]
11. Return SUCCESS response
```

**Response Sukses (200 OK):**
```json
{
  "status": "SUCCESS",
  "transaction_id": "TRX-SBANK-0001",
  "timestamp": "2024-06-01T09:01:05Z",
  "deducted_amounts": {
    "pokok": 7875,
    "fee_bank": 79,
    "pajak_sistem": 157,
    "fee_gateway": 39,
    "total_debit": 8150
  },
  "new_balance": 41850
}
```

**Response Gagal — Saldo Tidak Cukup (200 dengan status FAILED):**

> **Catatan:** SmartBank mengembalikan HTTP 200 dengan body `status: "FAILED"` karena request berhasil diproses (bukan error server); hasilnya adalah penolakan bisnis. LogistiKita-lah yang mentranslasikan ini menjadi HTTP 402.

```json
{
  "status": "FAILED",
  "error_code": "INSUFFICIENT_BALANCE",
  "message": "Saldo user USR-001 tidak mencukupi.",
  "required": 8150,
  "available": 3000
}
```

**Response Gagal — User Tidak Dikenal:**
```json
{
  "status": "FAILED",
  "error_code": "USER_NOT_FOUND",
  "message": "User USR-999 tidak terdaftar di SmartBank."
}
```

**Response Gagal — Daily Limit:**
```json
{
  "status": "FAILED",
  "error_code": "DAILY_LIMIT_EXCEEDED",
  "message": "User USR-001 telah mencapai batas 10 transaksi hari ini.",
  "count_today": 10,
  "limit": 10
}
```

**Response Gagal — Cooldown:**
```json
{
  "status": "FAILED",
  "error_code": "COOLDOWN_ACTIVE",
  "message": "Transaksi terlalu cepat. Tunggu 7 detik lagi.",
  "retry_after_seconds": 7
}
```

---

#### `GET /smartbank/balance/:user_id`

Mengecek saldo user tertentu (untuk debugging & verifikasi test).

```http
GET http://localhost:4000/smartbank/balance/USR-001
```

**Response:**
```json
{
  "user_id": "USR-001",
  "balance": 41850,
  "currency": "IDR",
  "transactions_today": 1,
  "last_transaction": "2024-06-01T09:01:05Z"
}
```

---

#### `GET /smartbank/ledger`

Melihat seluruh catatan transaksi ledger (untuk debugging).

```json
{
  "total": 2,
  "ledger": [
    {
      "id": 1,
      "transaction_id": "TRX-SBANK-0001",
      "timestamp": "2024-06-01T09:01:05Z",
      "from_user": "USR-001",
      "to_service": "logistikita",
      "amount": 7875,
      "fee_bank": 79,
      "pajak_sistem": 157,
      "fee_gateway": 39,
      "total_debit": 8150,
      "order_id": "ORD-20240601-0001",
      "status": "SUCCESS"
    }
  ]
}
```

---

#### `GET /smartbank/accounts`

Melihat saldo semua akun (user + service accounts).

```json
{
  "users": {
    "USR-001": 41850,
    "USR-002": 50000,
    "USR-003": 50000
  },
  "service_accounts": {
    "logistikita": 7875,
    "gateway": 39,
    "bank_reserve": 79
  },
  "money_sink_total": 157,
  "total_money_in_system": 209949
}
```

---

#### `POST /smartbank/topup`

Menambah saldo user tertentu (untuk keperluan testing skenario yang membutuhkan saldo lebih).

**Request:**
```json
{
  "user_id": "USR-001",
  "amount": 100000
}
```

**Response:**
```json
{
  "message": "Topup berhasil.",
  "user_id": "USR-001",
  "amount_added": 100000,
  "new_balance": 141850
}
```

---

#### `POST /smartbank/reset`

Mereset seluruh state SmartBank ke kondisi awal (saldo Rp50.000 per user, ledger kosong).

**Response:**
```json
{
  "message": "SmartBank state telah direset ke kondisi awal.",
  "users_reset": ["USR-001", "USR-002", "USR-003", "USR-004", "USR-005"],
  "initial_balance": 50000
}
```

---

#### `POST /mock/smartbank/config`

Memaksa SmartBank mengembalikan error tertentu untuk testing error path.

**Request:**
```json
{
  "force_error": "INSUFFICIENT_BALANCE",
  "active": true
}
```

| `force_error` | Efek |
|---|---|
| `null` | Perilaku normal (validasi sesungguhnya) |
| `"INSUFFICIENT_BALANCE"` | Selalu tolak dengan saldo tidak cukup |
| `"USER_NOT_FOUND"` | Selalu tolak dengan user tidak dikenal |
| `"DAILY_LIMIT_EXCEEDED"` | Selalu tolak dengan daily limit |
| `"COOLDOWN_ACTIVE"` | Selalu tolak dengan cooldown |
| `"SYSTEM_ERROR"` | Selalu return HTTP 500 |

**Response:**
```json
{
  "message": "Mock config updated.",
  "current_config": {
    "force_error": "INSUFFICIENT_BALANCE",
    "active": true
  }
}
```

---

#### `GET /smartbank/health`

```json
{
  "status": "UP",
  "service": "Mock SmartBank",
  "port": 4000,
  "users_count": 5,
  "transactions_total": 3,
  "timestamp": "2024-06-01T09:00:00Z"
}
```

---

### 6.3 Kalkulasi Fee SmartBank

```javascript
function hitungDebit(amount, feeGateway) {
  const feeBankPercentage  = parseFloat(process.env.FEE_BANK_PERCENTAGE) || 0.01;
  const taxPercentage      = parseFloat(process.env.TAX_PERCENTAGE)      || 0.02;

  const feeBank   = Math.floor(amount * feeBankPercentage);
  const pajak     = Math.floor(amount * taxPercentage);
  const totalDebit = amount + feeBank + pajak + feeGateway;

  return { feeBank, pajak, totalDebit };
}
```

**Contoh pada transaksi Rp7.875:**
```
amount        : Rp 7.875
fee_bank (1%) : Rp    79   (FLOOR 78.75 → 79 — dibulatkan ke bawah)
pajak (2%)    : Rp   157   (FLOOR 157.5 → 157)
fee_gateway   : Rp    39   (sudah dihitung di Gateway)
─────────────────────────
total_debit   : Rp 8.150
```

---

## 7. Mock Marketplace & SupplierHub Trigger

**File:** `mock-server/trigger.mock.js`
**Port:** `5500`
**Peran:** Mensimulasikan request dari Marketplace/SupplierHub ke LogistiKita backend. Digunakan oleh developer/tester untuk memulai alur pengiriman tanpa membutuhkan service Marketplace nyata.

### 7.1 Endpoint Mock Trigger

#### `POST /trigger/marketplace`

Mensimulasikan Marketplace mengirim permintaan pengiriman ke LogistiKita setelah checkout sukses.

**Request:**
```http
POST http://localhost:5500/trigger/marketplace
Content-Type: application/json
```

```json
{
  "order_id": "ORD-20240601-0001",
  "user_id": "USR-001",
  "alamat_tujuan": "Jl. Merdeka No. 10, Bandung, Jawa Barat",
  "jarak": 12.5,
  "nilai_transaksi": 150000
}
```

**Apa yang dilakukan trigger ini:**
1. Generate JWT token untuk `user_id` yang diberikan (menggunakan JWT_SECRET yang sama dengan backend)
2. Forward request ke `POST http://localhost:3001/logistikita/request_pengiriman` dengan `source_app: "marketplace"`
3. Kembalikan response dari LogistiKita ke caller

**Response (diteruskan dari LogistiKita):**
```json
{
  "triggered_by": "mock-marketplace",
  "logistikita_response": {
    "success": true,
    "data": {
      "shipment_id": "SHIP-20240601-0001",
      "order_id": "ORD-20240601-0001",
      "status": "PROCESSING",
      "ongkir": 7500,
      "fee_layanan": 375,
      "total_biaya": 7875,
      "transaction_id": "TRX-SBANK-0001",
      "message": "Pengiriman berhasil diproses dan pembayaran telah dilakukan."
    }
  }
}
```

---

#### `POST /trigger/supplierhub`

Mensimulasikan SupplierHub mengirim permintaan pengiriman ke LogistiKita.

**Request:**
```json
{
  "order_id": "ORD-SUP-20240601-0001",
  "user_id": "USR-002",
  "alamat_tujuan": "Jl. Industri No. 5, Surabaya, Jawa Timur",
  "jarak": 25.0,
  "nilai_transaksi": 500000
}
```

Sama dengan endpoint marketplace namun `source_app` di-set ke `"supplierhub"`.

---

#### `POST /trigger/batch`

Mengirim beberapa trigger sekaligus untuk load testing atau stress testing.

**Request:**
```json
{
  "count": 3,
  "source_app": "marketplace",
  "base_order_id": "ORD-BATCH",
  "user_id": "USR-001",
  "nilai_transaksi": 150000,
  "jarak": 10.0,
  "alamat_tujuan": "Jl. Test No. 1, Jakarta"
}
```

**Response:**
```json
{
  "total_sent": 3,
  "results": [
    { "order_id": "ORD-BATCH-001", "status": "PROCESSING", "success": true },
    { "order_id": "ORD-BATCH-002", "status": "PROCESSING", "success": true },
    { "order_id": "ORD-BATCH-003", "status": "FAILED", "error": "DAILY_LIMIT_EXCEEDED" }
  ]
}
```

---

#### `GET /trigger/generate-token`

Generate JWT token valid untuk testing manual (misal: dipakai di Postman/curl).

**Query param:**
```http
GET http://localhost:5500/trigger/generate-token?user_id=USR-001
```

**Response:**
```json
{
  "user_id": "USR-001",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": "1h",
  "usage": "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 8. Skenario Test & Simulasi

Skenario berikut harus dapat dijalankan menggunakan mock server tanpa modifikasi kode backend.

### 8.1 Happy Path — Transaksi Sukses

**Deskripsi:** User dengan saldo cukup melakukan pengiriman pertama hari ini.

**Setup:**
- Saldo USR-001: Rp50.000 (kondisi awal)
- Mock config: `force_error = null`

**Steps:**
```bash
# 1. Trigger dari Marketplace
POST http://localhost:5500/trigger/marketplace
{
  "order_id": "ORD-HP-001",
  "user_id": "USR-001",
  "nilai_transaksi": 150000,
  "jarak": 12.5,
  "alamat_tujuan": "Jl. Merdeka No. 10, Bandung"
}
```

**Expected Result:**
- LogistiKita response: 201 `status: "PROCESSING"`
- SmartBank saldo USR-001: berkurang dari Rp50.000 → Rp41.850
- Ledger SmartBank: 1 entri SUCCESS
- Shipment di LogistiKita DB: status PROCESSING
- Tracking logs: 2 entri (PENDING → PROCESSING)

---

### 8.2 Saldo Tidak Cukup

**Setup:**
- Saldo USR-003 dikurangi: `POST /smartbank/topup` dengan amount negatif (atau `reset` + set saldo manual)
- Gunakan user dengan saldo yang diperkecil

**Cara simulasi:**
```bash
# Reset dulu, lalu topup dengan jumlah kecil
POST http://localhost:4000/smartbank/reset
POST http://localhost:4000/smartbank/topup
{ "user_id": "USR-003", "amount": -49000 }   # Sisa saldo: Rp1.000
```

atau gunakan mock config:
```bash
POST http://localhost:4000/mock/smartbank/config
{ "force_error": "INSUFFICIENT_BALANCE", "active": true }
```

**Expected Result:**
- LogistiKita response: 402 `error_code: "PAYMENT_FAILED"`
- `smartbank_error: "INSUFFICIENT_BALANCE"`
- Shipment status: FAILED
- Tracking logs: 2 entri (PENDING → FAILED)
- Saldo USR-003: **tidak berubah** (transaksi dibatalkan)

---

### 8.3 Duplikat Order ID

**Setup:** Jalankan dua kali dengan `order_id` yang sama.

**Steps:**
```bash
# Request pertama → sukses
POST /trigger/marketplace { "order_id": "ORD-DUP-001", ... }

# Request kedua → harus ditolak
POST /trigger/marketplace { "order_id": "ORD-DUP-001", ... }
```

**Expected Result (request kedua):**
- LogistiKita response: 400 `error_code: "DUPLICATE_ORDER"`
- Tidak ada record baru di DB
- Tidak ada request ke SmartBank

---

### 8.4 Daily Limit Tercapai

**Setup:** Kirim 10 transaksi sukses dari user yang sama dalam satu hari.

**Cara cepat simulasi:**
```bash
POST http://localhost:4000/mock/smartbank/config
{ "force_error": "DAILY_LIMIT_EXCEEDED", "active": true }
```

**Expected Result:**
- LogistiKita response: 429 `error_code: "DAILY_LIMIT_EXCEEDED"`

---

### 8.5 Cooldown Active

**Setup:** Kirim dua transaksi dari user yang sama dalam interval < 10 detik.

**Cara cepat simulasi:**
```bash
POST http://localhost:4000/mock/smartbank/config
{ "force_error": "COOLDOWN_ACTIVE", "active": true }
```

**Expected Result:**
- LogistiKita response: 429 `error_code: "COOLDOWN_ACTIVE"`
- Response menyertakan `retry_after_seconds`

---

### 8.6 SmartBank Down

**Simulasi:**
```bash
# Matikan Mock SmartBank, atau:
POST http://localhost:4000/mock/smartbank/config
{ "force_error": "SYSTEM_ERROR", "active": true }
```

**Expected Result:**
- LogistiKita response: 503 `error_code: "SMARTBANK_DOWN"`
- Shipment status tetap PENDING (bukan FAILED — bisa di-retry)
- Error dicatat di transaction_logs

---

### 8.7 JWT Tidak Valid

**Setup:** Panggil endpoint LogistiKita langsung tanpa token atau dengan token palsu.

```bash
curl -X POST http://localhost:3001/logistikita/request_pengiriman \
  -H "Authorization: Bearer TOKEN_PALSU_INI" \
  -H "Content-Type: application/json" \
  -d '{ ... }'
```

**Expected Result:**
- Gateway response: 401 `error_code: "INVALID_TOKEN"`
- Request tidak sampai ke LogistiKita backend logic

---

### 8.8 Tracking Status oleh User yang Bukan Pemilik

```bash
# Buat shipment dengan USR-001
POST /trigger/marketplace { "order_id": "ORD-TRACK-001", "user_id": "USR-001", ... }

# Coba akses tracking dengan token USR-002 (bukan pemilik)
GET /logistikita/tracking_status?order_id=ORD-TRACK-001
Authorization: Bearer <token_USR-002>
```

**Expected Result:**
- Response: 403 `error_code: "FORBIDDEN"`

---

### 8.9 Kalkulasi Ongkir Minimum

**Setup:** Kirim nilai_transaksi sangat kecil sehingga 5%-nya < Rp5.000.

```bash
POST /trigger/marketplace
{
  "order_id": "ORD-MIN-001",
  "user_id": "USR-001",
  "nilai_transaksi": 50000,   # 5% = Rp2.500 → ongkir seharusnya Rp5.000
  "jarak": 5.0,
  "alamat_tujuan": "Jl. Test, Jakarta"
}
```

**Expected Result:**
- `ongkir: 5000` (bukan 2500 — flat minimum berlaku)
- `fee_layanan: 250` (5% × 5000)
- `total_biaya: 5250`

---

## 9. State Management In-Memory

### 9.1 Seed Data Awal (`data/seed.js`)

```javascript
const INITIAL_STATE = {
  balances: {
    'USR-001': 50000,
    'USR-002': 50000,
    'USR-003': 50000,
    'USR-004': 50000,
    'USR-005': 50000,
  },
  serviceAccounts: {
    'logistikita':   0,
    'gateway':       0,
    'bank_reserve':  0,
  },
  ledger: [],
  userTransactions: {},
  mockConfig: {
    force_error: null,
    latency_ms: 200,
  }
};

module.exports = { INITIAL_STATE };
```

> **Total Money Supply Awal:** Rp50.000 × 5 user = Rp250.000
> Sesuai dengan aturan ekosistem: distribusi awal ≤ 2% dari total supply (Rp1.000.000.000). Untuk keperluan testing ini cukup.

### 9.2 Fungsi Reset State

```javascript
function resetState() {
  const fresh = JSON.parse(JSON.stringify(INITIAL_STATE));
  Object.assign(state, fresh);
  console.log('[SmartBank] State direset ke kondisi awal.');
}
```

---

## 10. Implementasi Kode Lengkap

### 10.1 `smartbank.mock.js`

```javascript
'use strict';

require('dotenv').config();
const express    = require('express');
const { v4: uuidv4 } = require('uuid');
const { INITIAL_STATE } = require('./data/seed');

const app  = express();
const PORT = process.env.SMARTBANK_PORT || 4000;

app.use(express.json());

// ── STATE ────────────────────────────────────────────────────────────
let state = JSON.parse(JSON.stringify(INITIAL_STATE));

const FEE_BANK  = parseFloat(process.env.FEE_BANK_PERCENTAGE) || 0.01;
const TAX       = parseFloat(process.env.TAX_PERCENTAGE)      || 0.02;
const COOLDOWN  = parseInt(process.env.COOLDOWN_SECONDS)      || 10;
const MAX_DAILY = parseInt(process.env.MAX_DAILY_TRANSACTIONS) || 10;

// ── HELPERS ──────────────────────────────────────────────────────────
function logRequest(method, path, body = {}) {
  console.log(`[SmartBank] ${new Date().toISOString()} ${method} ${path}`, body);
}

function countTodayTransactions(userId) {
  const txList = state.userTransactions[userId] || [];
  const today  = new Date().toDateString();
  return txList.filter(tx => new Date(tx.timestamp).toDateString() === today).length;
}

function getLastTransactionTime(userId) {
  const txList = state.userTransactions[userId] || [];
  if (txList.length === 0) return null;
  return txList[txList.length - 1].timestamp;
}

// ── ENDPOINT: POST /payment ──────────────────────────────────────────
app.post('/payment', (req, res) => {
  logRequest('POST', '/payment', req.body);

  const { from_user, to_service, amount, fee_gateway = 0, metadata } = req.body;

  // Simulasi latency
  setTimeout(() => {

    // 1. Mock config override
    if (state.mockConfig.force_error) {
      const errMap = {
        'INSUFFICIENT_BALANCE': {
          status: 'FAILED', error_code: 'INSUFFICIENT_BALANCE',
          message: 'Saldo tidak mencukupi (mock forced).'
        },
        'USER_NOT_FOUND': {
          status: 'FAILED', error_code: 'USER_NOT_FOUND',
          message: 'User tidak ditemukan (mock forced).'
        },
        'DAILY_LIMIT_EXCEEDED': {
          status: 'FAILED', error_code: 'DAILY_LIMIT_EXCEEDED',
          message: 'Daily limit tercapai (mock forced).', count_today: 10, limit: MAX_DAILY
        },
        'COOLDOWN_ACTIVE': {
          status: 'FAILED', error_code: 'COOLDOWN_ACTIVE',
          message: 'Cooldown aktif (mock forced).', retry_after_seconds: COOLDOWN
        },
        'SYSTEM_ERROR': null,
      };
      if (state.mockConfig.force_error === 'SYSTEM_ERROR') {
        return res.status(500).json({ status: 'FAILED', error_code: 'SYSTEM_ERROR', message: 'SmartBank error (mock forced).' });
      }
      return res.json(errMap[state.mockConfig.force_error]);
    }

    // 2. Validasi user
    if (!(from_user in state.balances)) {
      return res.json({
        status: 'FAILED', error_code: 'USER_NOT_FOUND',
        message: `User ${from_user} tidak terdaftar di SmartBank.`
      });
    }

    // 3. Cek cooldown
    const lastTx = getLastTransactionTime(from_user);
    if (lastTx) {
      const diffSec = (Date.now() - new Date(lastTx).getTime()) / 1000;
      if (diffSec < COOLDOWN) {
        const retryAfter = Math.ceil(COOLDOWN - diffSec);
        return res.json({
          status: 'FAILED', error_code: 'COOLDOWN_ACTIVE',
          message: `Transaksi terlalu cepat. Tunggu ${retryAfter} detik lagi.`,
          retry_after_seconds: retryAfter
        });
      }
    }

    // 4. Cek daily limit
    const countToday = countTodayTransactions(from_user);
    if (countToday >= MAX_DAILY) {
      return res.json({
        status: 'FAILED', error_code: 'DAILY_LIMIT_EXCEEDED',
        message: `User ${from_user} telah mencapai batas ${MAX_DAILY} transaksi hari ini.`,
        count_today: countToday, limit: MAX_DAILY
      });
    }

    // 5. Hitung total debit
    const feeBank  = Math.floor(amount * FEE_BANK);
    const pajak    = Math.floor(amount * TAX);
    const totalDebit = amount + feeBank + pajak + fee_gateway;

    // 6. Validasi saldo
    if (state.balances[from_user] < totalDebit) {
      return res.json({
        status: 'FAILED', error_code: 'INSUFFICIENT_BALANCE',
        message: `Saldo ${from_user} tidak mencukupi.`,
        required: totalDebit, available: state.balances[from_user]
      });
    }

    // 7. Eksekusi transaksi
    const txId = `TRX-SBANK-${String(state.ledger.length + 1).padStart(4, '0')}`;
    const timestamp = new Date().toISOString();

    state.balances[from_user]              -= totalDebit;
    state.serviceAccounts[to_service]      = (state.serviceAccounts[to_service] || 0) + amount;
    state.serviceAccounts['bank_reserve']  += feeBank;
    state.serviceAccounts['gateway']       += fee_gateway;
    // pajak → money sink (tidak dicatat ke akun manapun)

    // 8. Catat ke ledger
    const ledgerEntry = {
      id: state.ledger.length + 1,
      transaction_id: txId, timestamp,
      from_user, to_service, amount,
      fee_bank: feeBank, pajak_sistem: pajak,
      fee_gateway, total_debit: totalDebit,
      order_id: metadata?.order_id,
      status: 'SUCCESS'
    };
    state.ledger.push(ledgerEntry);

    // 9. Catat riwayat user
    if (!state.userTransactions[from_user]) state.userTransactions[from_user] = [];
    state.userTransactions[from_user].push({ timestamp, transaction_id: txId, amount });

    // 10. Return response
    return res.json({
      status: 'SUCCESS',
      transaction_id: txId,
      timestamp,
      deducted_amounts: {
        pokok: amount, fee_bank: feeBank, pajak_sistem: pajak,
        fee_gateway, total_debit: totalDebit
      },
      new_balance: state.balances[from_user]
    });

  }, state.mockConfig.latency_ms || 0);
});

// ── ENDPOINT: GET /smartbank/balance/:user_id ────────────────────────
app.get('/smartbank/balance/:user_id', (req, res) => {
  const { user_id } = req.params;
  if (!(user_id in state.balances)) {
    return res.status(404).json({ error: 'User tidak ditemukan.' });
  }
  const txList = state.userTransactions[user_id] || [];
  const today  = new Date().toDateString();
  const txToday = txList.filter(tx => new Date(tx.timestamp).toDateString() === today).length;
  return res.json({
    user_id, balance: state.balances[user_id], currency: 'IDR',
    transactions_today: txToday,
    last_transaction: txList.length ? txList[txList.length - 1].timestamp : null
  });
});

// ── ENDPOINT: GET /smartbank/ledger ─────────────────────────────────
app.get('/smartbank/ledger', (req, res) => {
  res.json({ total: state.ledger.length, ledger: state.ledger });
});

// ── ENDPOINT: GET /smartbank/accounts ───────────────────────────────
app.get('/smartbank/accounts', (req, res) => {
  const moneySink = state.ledger.reduce((sum, e) => sum + (e.pajak_sistem || 0), 0);
  const totalSystem = Object.values(state.balances).reduce((a, b) => a + b, 0)
    + Object.values(state.serviceAccounts).reduce((a, b) => a + b, 0);
  res.json({ users: state.balances, service_accounts: state.serviceAccounts, money_sink_total: moneySink, total_money_in_system: totalSystem });
});

// ── ENDPOINT: POST /smartbank/topup ─────────────────────────────────
app.post('/smartbank/topup', (req, res) => {
  const { user_id, amount } = req.body;
  if (!(user_id in state.balances)) {
    return res.status(404).json({ error: 'User tidak ditemukan.' });
  }
  state.balances[user_id] += amount;
  res.json({ message: 'Topup berhasil.', user_id, amount_added: amount, new_balance: state.balances[user_id] });
});

// ── ENDPOINT: POST /smartbank/reset ─────────────────────────────────
app.post('/smartbank/reset', (req, res) => {
  state = JSON.parse(JSON.stringify(INITIAL_STATE));
  res.json({ message: 'SmartBank state direset.', users_reset: Object.keys(state.balances), initial_balance: 50000 });
});

// ── ENDPOINT: POST /mock/smartbank/config ───────────────────────────
app.post('/mock/smartbank/config', (req, res) => {
  const { force_error, active, latency_ms } = req.body;
  if (active === false) state.mockConfig.force_error = null;
  else state.mockConfig.force_error = force_error || null;
  if (latency_ms !== undefined) state.mockConfig.latency_ms = latency_ms;
  res.json({ message: 'Mock config updated.', current_config: state.mockConfig });
});

// ── ENDPOINT: GET /smartbank/health ─────────────────────────────────
app.get('/smartbank/health', (req, res) => {
  res.json({
    status: 'UP', service: 'Mock SmartBank', port: PORT,
    users_count: Object.keys(state.balances).length,
    transactions_total: state.ledger.length,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`[Mock SmartBank] Berjalan di http://localhost:${PORT}`);
});
```

---

### 10.2 `gateway.mock.js`

```javascript
'use strict';

require('dotenv').config();
const express = require('express');
const axios   = require('axios');
const jwt     = require('jsonwebtoken');

const app  = express();
const PORT = process.env.GATEWAY_PORT || 5000;
const SMARTBANK_URL = process.env.SMARTBANK_BASE_URL || 'http://localhost:4000';
const FEE_GATEWAY   = parseFloat(process.env.FEE_GATEWAY_PERCENTAGE) || 0.005;

app.use(express.json());

// State log in-memory
const gatewayLogs = [];
let mockConfig = { force_error: null };

function logRequest(entry) {
  gatewayLogs.push({ id: gatewayLogs.length + 1, ...entry });
  console.log(`[Gateway] ${entry.timestamp} POST /logistics/pay | amount: ${entry.amount}`);
}

function validateJWT(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  try {
    jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
    return true;
  } catch { return false; }
}

// ── ENDPOINT: POST /logistics/pay ───────────────────────────────────
app.post('/logistics/pay', async (req, res) => {
  // Mock config override
  if (mockConfig.force_error === 'JWT_INVALID') {
    return res.status(401).json({ status: 'FAILED', error_code: 'INVALID_TOKEN', message: 'JWT tidak valid (mock forced).' });
  }
  if (mockConfig.force_error === 'GATEWAY_DOWN') {
    return res.status(503).json({ status: 'FAILED', error_code: 'GATEWAY_DOWN', message: 'Gateway tidak tersedia (mock forced).' });
  }

  // Validasi JWT
  if (!validateJWT(req.headers.authorization)) {
    return res.status(401).json({ status: 'FAILED', error_code: 'INVALID_TOKEN', message: 'JWT token tidak valid atau sudah expired.' });
  }

  const { amount, from_user, to_service, metadata, from_app } = req.body;
  const feeGateway = Math.floor(amount * FEE_GATEWAY);

  const payload = { ...req.body, fee_gateway: feeGateway };

  try {
    const response = await axios.post(`${SMARTBANK_URL}/payment`, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    logRequest({
      timestamp: new Date().toISOString(),
      from_app, from_user, amount, fee_gateway: feeGateway,
      smartbank_response_status: response.data?.status
    });

    return res.json(response.data);
  } catch (err) {
    console.error('[Gateway] SmartBank tidak dapat dihubungi:', err.message);
    logRequest({
      timestamp: new Date().toISOString(),
      from_app, from_user, amount, fee_gateway: feeGateway,
      smartbank_response_status: 'NETWORK_ERROR'
    });
    return res.status(503).json({
      status: 'FAILED', error_code: 'SMARTBANK_UNREACHABLE',
      message: 'SmartBank tidak dapat dihubungi.'
    });
  }
});

// ── ENDPOINT: GET /gateway/health ───────────────────────────────────
app.get('/gateway/health', (req, res) => {
  res.json({ status: 'UP', service: 'Mock API Gateway', port: PORT, timestamp: new Date().toISOString() });
});

// ── ENDPOINT: GET /gateway/logs ─────────────────────────────────────
app.get('/gateway/logs', (req, res) => {
  res.json({ total: gatewayLogs.length, logs: gatewayLogs });
});

// ── ENDPOINT: POST /gateway/reset ───────────────────────────────────
app.post('/gateway/reset', (req, res) => {
  gatewayLogs.length = 0;
  res.json({ message: 'Gateway logs cleared.' });
});

// ── ENDPOINT: POST /mock/gateway/config ─────────────────────────────
app.post('/mock/gateway/config', (req, res) => {
  const { force_error, active } = req.body;
  mockConfig.force_error = active ? force_error : null;
  res.json({ message: 'Gateway mock config updated.', current_config: mockConfig });
});

app.listen(PORT, () => {
  console.log(`[Mock Gateway] Berjalan di http://localhost:${PORT}`);
});
```

---

### 10.3 `trigger.mock.js`

```javascript
'use strict';

require('dotenv').config();
const express = require('express');
const axios   = require('axios');
const jwt     = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const app  = express();
const PORT = process.env.TRIGGER_PORT || 5500;
const LOGISTIKITA_URL = process.env.LOGISTIKITA_BASE_URL || 'http://localhost:3001';

app.use(express.json());

function generateToken(userId) {
  return jwt.sign(
    { user_id: userId, email: `${userId.toLowerCase()}@test.com` },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

async function sendToLogistikita(payload, sourceApp) {
  const token = generateToken(payload.user_id);
  const body  = { ...payload, source_app: sourceApp };
  return axios.post(`${LOGISTIKITA_URL}/logistikita/request_pengiriman`, body, {
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    timeout: 15000,
    validateStatus: () => true   // Jangan throw error untuk status 4xx/5xx
  });
}

// ── ENDPOINT: POST /trigger/marketplace ─────────────────────────────
app.post('/trigger/marketplace', async (req, res) => {
  try {
    const response = await sendToLogistikita(req.body, 'marketplace');
    res.status(response.status).json({ triggered_by: 'mock-marketplace', logistikita_response: response.data });
  } catch (err) {
    res.status(503).json({ error: 'LogistiKita tidak dapat dihubungi.', detail: err.message });
  }
});

// ── ENDPOINT: POST /trigger/supplierhub ─────────────────────────────
app.post('/trigger/supplierhub', async (req, res) => {
  try {
    const response = await sendToLogistikita(req.body, 'supplierhub');
    res.status(response.status).json({ triggered_by: 'mock-supplierhub', logistikita_response: response.data });
  } catch (err) {
    res.status(503).json({ error: 'LogistiKita tidak dapat dihubungi.', detail: err.message });
  }
});

// ── ENDPOINT: POST /trigger/batch ───────────────────────────────────
app.post('/trigger/batch', async (req, res) => {
  const { count = 3, source_app = 'marketplace', base_order_id = 'ORD-BATCH', ...rest } = req.body;
  const results = [];
  for (let i = 1; i <= count; i++) {
    const orderId = `${base_order_id}-${String(i).padStart(3, '0')}`;
    try {
      const response = await sendToLogistikita({ ...rest, order_id: orderId }, source_app);
      results.push({
        order_id: orderId,
        status: response.data?.data?.status || 'UNKNOWN',
        success: response.data?.success,
        error: response.data?.error?.code
      });
    } catch {
      results.push({ order_id: orderId, success: false, error: 'NETWORK_ERROR' });
    }
    // Jeda antar request untuk menghindari cooldown
    await new Promise(r => setTimeout(r, 11000));
  }
  res.json({ total_sent: count, results });
});

// ── ENDPOINT: GET /trigger/generate-token ───────────────────────────
app.get('/trigger/generate-token', (req, res) => {
  const { user_id = 'USR-001' } = req.query;
  const token = generateToken(user_id);
  res.json({
    user_id, token, expires_in: '1h',
    usage: `Authorization: Bearer ${token}`
  });
});

app.listen(PORT, () => {
  console.log(`[Mock Trigger] Berjalan di http://localhost:${PORT}`);
});
```

---

### 10.4 `package.json`

```json
{
  "name": "logistikita-mock-server",
  "version": "1.0.0",
  "description": "Mock server: SmartBank, API Gateway, dan Trigger untuk pengembangan LogistiKita",
  "scripts": {
    "start:all":       "concurrently \"node smartbank.mock.js\" \"node gateway.mock.js\" \"node trigger.mock.js\"",
    "start:smartbank": "node smartbank.mock.js",
    "start:gateway":   "node gateway.mock.js",
    "start:trigger":   "node trigger.mock.js",
    "dev":             "concurrently \"nodemon smartbank.mock.js\" \"nodemon gateway.mock.js\" \"nodemon trigger.mock.js\""
  },
  "dependencies": {
    "axios": "^1.6.0",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "jsonwebtoken": "^9.0.2",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "concurrently": "^8.2.2",
    "nodemon": "^3.0.2"
  }
}
```

---

## 11. Cara Menjalankan

### 11.1 Setup Awal

```bash
cd mock-server
npm install
cp .env.example .env
# Edit .env: pastikan JWT_SECRET sama dengan backend/.env
```

### 11.2 Menjalankan Semua Mock Sekaligus

```bash
npm start
# atau mode development (auto-reload saat file berubah):
npm run dev
```

Output yang diharapkan:
```
[Mock SmartBank] Berjalan di http://localhost:4000
[Mock Gateway]   Berjalan di http://localhost:5000
[Mock Trigger]   Berjalan di http://localhost:5500
```

### 11.3 Urutan Start yang Benar

```
1. Mock SmartBank (4000)  ← harus pertama
2. Mock Gateway (5000)    ← setelah SmartBank
3. LogistiKita Backend (3001)  ← setelah Gateway
4. Mock Trigger (5500)    ← terakhir (opsional, untuk testing)
```

### 11.4 Testing Cepat dengan curl

```bash
# 1. Cek health semua service
curl http://localhost:4000/smartbank/health
curl http://localhost:5000/gateway/health

# 2. Generate token untuk USR-001
curl "http://localhost:5500/trigger/generate-token?user_id=USR-001"

# 3. Trigger pengiriman dari Marketplace
curl -X POST http://localhost:5500/trigger/marketplace \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "ORD-TEST-001",
    "user_id": "USR-001",
    "alamat_tujuan": "Jl. Merdeka No. 10, Bandung",
    "jarak": 12.5,
    "nilai_transaksi": 150000
  }'

# 4. Cek saldo USR-001 setelah transaksi
curl http://localhost:4000/smartbank/balance/USR-001

# 5. Cek tracking di LogistiKita
TOKEN=$(curl -s "http://localhost:5500/trigger/generate-token?user_id=USR-001" | node -e "process.stdin.on('data', d => console.log(JSON.parse(d).token))")
curl "http://localhost:3001/logistikita/tracking_status?order_id=ORD-TEST-001" \
  -H "Authorization: Bearer $TOKEN"

# 6. Reset semua state
curl -X POST http://localhost:4000/smartbank/reset
curl -X POST http://localhost:5000/gateway/reset
```

### 11.5 Testing Skenario Error (Mock Config)

```bash
# Paksa semua transaksi gagal karena saldo kurang
curl -X POST http://localhost:4000/mock/smartbank/config \
  -H "Content-Type: application/json" \
  -d '{ "force_error": "INSUFFICIENT_BALANCE", "active": true }'

# Kembalikan ke perilaku normal
curl -X POST http://localhost:4000/mock/smartbank/config \
  -H "Content-Type: application/json" \
  -d '{ "force_error": null, "active": false }'
```

---

## 12. Acceptance Criteria

### Mock SmartBank

- [ ] Menyimpan saldo 5 user awal (masing-masing Rp50.000) secara in-memory
- [ ] Memvalidasi keberadaan `from_user` sebelum memproses
- [ ] Mengimplementasikan cooldown 10 detik antar transaksi per user
- [ ] Mengimplementasikan daily limit 10 transaksi per user per hari
- [ ] Menolak transaksi jika saldo tidak mencukupi `total_debit`
- [ ] Menghitung `fee_bank (1%)` dan `pajak (2%)` dengan benar menggunakan `FLOOR()`
- [ ] Mengeksekusi debit/kredit atomik ke `balances` dan `serviceAccounts`
- [ ] Mencatat semua transaksi ke `ledger` in-memory
- [ ] Menyediakan endpoint `/smartbank/balance/:user_id`, `/smartbank/ledger`, `/smartbank/accounts`
- [ ] Menyediakan endpoint `/smartbank/topup` dan `/smartbank/reset`
- [ ] Mendukung `force_error` melalui `/mock/smartbank/config`
- [ ] Mengembalikan `transaction_id` unik untuk setiap transaksi sukses

### Mock API Gateway

- [ ] Memvalidasi JWT token di setiap request ke `/logistics/pay`
- [ ] Menghitung `fee_gateway (0.5%)` dengan `FLOOR()` dan menambahkannya ke payload
- [ ] Meneruskan request ke Mock SmartBank dan mengembalikan response-nya ke caller
- [ ] Menangani ketidaktersediaan Mock SmartBank dengan response 503
- [ ] Mencatat semua request ke log in-memory (`/gateway/logs`)
- [ ] Mendukung `force_error` melalui `/mock/gateway/config`

### Mock Trigger

- [ ] Meng-generate JWT token valid untuk `user_id` yang diberikan
- [ ] Meneruskan request ke LogistiKita backend dengan `source_app: "marketplace"` atau `"supplierhub"`
- [ ] Menyediakan endpoint batch trigger dengan jeda cooldown otomatis antar request
- [ ] Mengembalikan response LogistiKita secara transparan ke pemanggil

### Umum

- [ ] Semua mock berjalan dari satu perintah `npm start`
- [ ] State dapat di-reset kapan saja via endpoint `/reset`
- [ ] Semua request dicatat ke console dengan timestamp
- [ ] JWT_SECRET di mock server identik dengan backend agar token kompatibel

---

*PRD Mock Server ini merupakan bagian dari ekosistem LogistiKita. Lihat [PRD-backend.md](./PRD-backend.md) untuk spesifikasi backend dan [README.md](./README.md) untuk gambaran keseluruhan sistem.*
