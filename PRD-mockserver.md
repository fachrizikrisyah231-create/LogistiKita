# PRD Mock Server — LogistiKita

> **Dokumen:** Product Requirements Document (Mock Server)
> **Proyek:** LogistiKita — Aplikasi Manajemen Pengiriman Barang
> **Mata Kuliah:** Rekayasa Perangkat Lunak 2
> **Stack Mock:** Node.js + Express.js (3 mock dalam 1 proses)
> **Versi:** 2.0.0 | Tanggal: 2026-06-17

---

## Daftar Isi

1. [Overview & Tujuan](#1-overview--tujuan)
2. [Arsitektur Mock Server](#2-arsitektur-mock-server)
3. [Struktur Direktori Mock Server](#3-struktur-direktori-mock-server)
4. [Environment & Konfigurasi](#4-environment--konfigurasi)
5. [Mock SmartBank](#5-mock-smartbank)
6. [Mock API Gateway](#6-mock-api-gateway)
7. [Mock Trigger](#7-mock-trigger)
8. [Seed Data](#8-seed-data)
9. [Skenario Test / Acceptance Test](#9-skenario-test--acceptance-test)
10. [Implementasi Kode](#10-implementasi-kode)
11. [Acceptance Criteria](#11-acceptance-criteria)

---

## 1. Overview & Tujuan

Mock Server menyediakan **simulasi** layanan eksternal yang dibutuhkan LogistiKita:

| Mock | Representasi | Port | Fungsi |
|---|---|---|---|
| **Mock SmartBank** | SmartBank (Core Banking) | 4000 | Menerima payment, validasi saldo, debit/kredit |
| **Mock API Gateway** | API Gateway / Integrator | 5000 | Validasi JWT, potong fee gateway, forward ke SmartBank |
| **Mock Trigger** | Marketplace / SupplierHub | 5500 | Men-trigger pengiriman ke LogistiKita backend |

### Catatan Penting

- Mock server **bukan** bagian dari LogistiKita; ini alat bantu untuk pengembangan dan pengujian
- Semua state disimpan **in-memory** — hilang saat server restart
- `JWT_SECRET` di mock **harus sama** dengan backend LogistiKita agar token kompatibel
- Mock server mendukung **3 tipe pengiriman** (reguler, nextday, sameday) dan **koordinat** untuk kalkulasi jarak

---

## 2. Arsitektur Mock Server

```
                    ┌─────────────────┐
                    │  Mock Trigger    │
                    │    :5500         │
                    │                 │
                    │ POST /trigger/  │
                    │   marketplace   │
                    │   supplierhub   │
                    │   direct        │
                    └───────┬─────────┘
                            │ POST /api/request_pengiriman (marketplace/supplierhub)
                            │ POST /api/pengiriman (direct)
                            ▼
                    ┌─────────────────┐
                    │ LogistiKita     │
                    │ Backend :3001   │
                    │                 │
                    │ Hitung ongkir   │
                    │ (jarak × tarif) │
                    └───────┬─────────┘
                            │ POST /logistics/pay
                            ▼
                    ┌─────────────────┐
                    │ Mock Gateway    │
                    │    :5000        │
                    │                 │
                    │ Validasi JWT    │
                    │ Fee 0.5%        │
                    └───────┬─────────┘
                            │ Forward ke SmartBank
                            ▼
                    ┌─────────────────┐
                    │ Mock SmartBank  │
                    │    :4000        │
                    │                 │
                    │ Debit user      │
                    │ Kredit service  │
                    │ Fee 1% + Tax 2% │
                    │ Ledger          │
                    └─────────────────┘
```

---

## 3. Struktur Direktori Mock Server

```
mock-server/
├── smartbank.mock.js       # Mock SmartBank core
├── gateway.mock.js         # Mock API Gateway
├── trigger.mock.js         # Mock Trigger (Marketplace/SupplierHub/Direct)
├── data/
│   └── seed.js             # Seed data: users, balances, branches
├── index.js                # Entry point: jalankan ketiga mock
├── package.json
└── .env
```

---

## 4. Environment & Konfigurasi

### `mock-server/.env`

```env
# ─── Port ──────────────────────────────────────────────────────
SMARTBANK_PORT=4000
GATEWAY_PORT=5000
TRIGGER_PORT=5500

# ─── Target Backend ───────────────────────────────────────────
LOGISTIKITA_BACKEND_URL=http://localhost:3001

# ─── JWT ───────────────────────────────────────────────────────
JWT_SECRET=your_jwt_secret_key_min_32_chars

# ─── SmartBank Config ──────────────────────────────────────────
INITIAL_BALANCE=50000
FEE_BANK_PERCENTAGE=0.01
PAJAK_SISTEM_PERCENTAGE=0.02
FEE_GATEWAY_PERCENTAGE=0.005
```

---

## 5. Mock SmartBank

Port: **4000**

### 5.1 In-Memory State

```javascript
const state = {
  balances: {},         // { user_id: number }
  serviceAccounts: {},  // { "logistikita": number, "gateway": number }
  ledger: [],           // Array of transaction records
  config: {
    forceError: null,   // null | 'INSUFFICIENT_BALANCE' | 'USER_NOT_FOUND' | 'SYSTEM_ERROR'
  },
};
```

### 5.2 Endpoints

#### `POST /payment`

Menerima payment request dari Gateway.

**Request Body:**
```json
{
  "from_app": "logistikita",
  "from_user": "USR-001",
  "to_service": "logistikita",
  "amount": 26250,
  "fee_gateway": 131,
  "metadata": {
    "order_id": "ORD-001",
    "shipment_id": "SHIP-001",
    "type": "ongkir",
    "tipe_pengiriman": "reguler",
    "breakdown": {
      "ongkir": 25000,
      "fee_layanan_logistik": 1250
    }
  }
}
```

**Proses:**
1. Cek `forceError` config → jika aktif, kembalikan error
2. Cek `from_user` ada di `balances` → jika tidak, 400 `USER_NOT_FOUND`
3. Hitung:
   - `fee_bank = FLOOR(amount * 0.01)` → Rp262
   - `pajak = FLOOR(amount * 0.02)` → Rp525
   - `total_debit = amount + fee_bank + pajak + fee_gateway`
4. Cek `balances[from_user] >= total_debit` → jika tidak, 400 `INSUFFICIENT_BALANCE`
5. Eksekusi atomik:
   - `balances[from_user] -= total_debit`
   - `serviceAccounts[to_service] += amount`
   - `serviceAccounts["reserve_bank"] += fee_bank`
   - `serviceAccounts["gateway"] += fee_gateway`
   - (pajak = money sink, tidak dicatat ke akun manapun)
6. Catat ke `ledger`
7. Return sukses

**Response Sukses (200):**
```json
{
  "status": "SUCCESS",
  "transaction_id": "TRX-SBANK-001",
  "timestamp": "2026-06-17T09:00:00Z",
  "deducted_amounts": {
    "pokok": 26250,
    "fee_bank": 262,
    "pajak_sistem": 525,
    "fee_gateway": 131,
    "total_debit": 27168
  },
  "new_balance": 22832
}
```

#### `GET /smartbank/balance/:user_id`

Return saldo user.

#### `GET /smartbank/ledger`

Return seluruh ledger.

#### `GET /smartbank/accounts`

Return semua `serviceAccounts` (saldo akun layanan).

#### `POST /smartbank/topup`

Top-up saldo user (untuk testing).

```json
{ "user_id": "USR-001", "amount": 1000000 }
```

#### `POST /smartbank/reset`

Reset semua state ke seed data awal.

#### `POST /mock/smartbank/config`

Konfigurasi force error.

```json
{ "forceError": "INSUFFICIENT_BALANCE" }
```

---

## 6. Mock API Gateway

Port: **5000**

### 6.1 Endpoints

#### `POST /logistics/pay`

**Proses:**
1. Validasi JWT token dari header `Authorization`
2. Hitung `fee_gateway = FLOOR(amount * 0.005)`
3. Tambahkan `fee_gateway` ke payload
4. Forward ke Mock SmartBank `POST :4000/payment`
5. Return response SmartBank ke caller

**Request Body (dari LogistiKita):**
```json
{
  "from_app": "logistikita",
  "from_user": "USR-001",
  "to_service": "logistikita",
  "amount": 26250,
  "metadata": { ... }
}
```

**Proses Gateway:**
- fee_gateway = FLOOR(26250 × 0.005) = 131
- Forward ke SmartBank dengan tambahan `"fee_gateway": 131`

#### `GET /gateway/logs`

Return semua request logs yang melewati gateway.

#### `POST /mock/gateway/config`

Konfigurasi force error.

---

## 7. Mock Trigger

Port: **5500**

### 7.1 Fungsi

Mensimulasikan **tiga sumber** pengiriman:
1. **Marketplace** — POST ke LogistiKita `/request_pengiriman`
2. **SupplierHub** — POST ke LogistiKita `/request_pengiriman`
3. **Direct User** — POST ke LogistiKita `/pengiriman` (simulasi user buat sendiri)

### 7.2 Endpoints

#### `POST /trigger/marketplace`

Generate JWT token, lalu POST ke LogistiKita backend:

**Request Body:**
```json
{
  "user_id": "USR-001",
  "alamat_asal": "Jl. Merdeka No. 10, Bandung",
  "lat_asal": -6.9175,
  "lng_asal": 107.6191,
  "alamat_tujuan": "Jl. Pahlawan No. 5, Surabaya",
  "lat_tujuan": -7.2575,
  "lng_tujuan": 112.7521,
  "tipe_pengiriman": "reguler",
  "nilai_transaksi": 150000
}
```

**Proses:**
1. Generate JWT token untuk `user_id`
2. Generate `order_id` unik (format: `MKT-YYYYMMDD-XXXX`)
3. POST ke `http://localhost:3001/api/request_pengiriman` dengan:
   ```json
   {
     "order_id": "MKT-20260617-0001",
     "user_id": "USR-001",
     "alamat_asal": "...",
     "lat_asal": -6.9175,
     "lng_asal": 107.6191,
     "alamat_tujuan": "...",
     "lat_tujuan": -7.2575,
     "lng_tujuan": 112.7521,
     "tipe_pengiriman": "reguler",
     "source_app": "marketplace",
     "nilai_transaksi": 150000
   }
   ```
4. Return response dari LogistiKita

#### `POST /trigger/supplierhub`

Sama seperti marketplace, tapi `source_app = "supplierhub"` dan `order_id` format: `SUP-YYYYMMDD-XXXX`.

#### `POST /trigger/direct`

Mensimulasikan user yang buat pengiriman sendiri. **Tidak mengirim `source_app`**.

**Request Body:**
```json
{
  "user_id": "USR-001",
  "alamat_asal": "Jl. Asia Afrika No. 1, Bandung",
  "lat_asal": -6.9217,
  "lng_asal": 107.6094,
  "alamat_tujuan": "Jl. Malioboro, Yogyakarta",
  "lat_tujuan": -7.7928,
  "lng_tujuan": 110.3659,
  "tipe_pengiriman": "nextday"
}
```

**Proses:**
1. Generate JWT token untuk `user_id`
2. POST ke `http://localhost:3001/api/pengiriman` (endpoint user langsung)
3. Return response

#### `POST /trigger/batch`

Mengirim beberapa request sekaligus dengan jeda cooldown otomatis.

**Request Body:**
```json
{
  "requests": [
    { "source": "marketplace", "user_id": "USR-001", "lat_asal": -6.9175, "lng_asal": 107.6191, "lat_tujuan": -7.2575, "lng_tujuan": 112.7521 },
    { "source": "supplierhub", "user_id": "USR-002", "lat_asal": -6.2088, "lng_asal": 106.8456, "lat_tujuan": -6.9175, "lng_tujuan": 107.6191 },
    { "source": "direct", "user_id": "USR-003", "lat_asal": -6.9175, "lng_asal": 107.6191, "lat_tujuan": -7.7956, "lng_tujuan": 110.3695, "tipe_pengiriman": "sameday" }
  ],
  "cooldown_ms": 15000
}
```

#### `GET /trigger/status`

Return status batch trigger dan riwayat trigger yang telah dilakukan.

---

## 8. Seed Data

### 8.1 User Balances (SmartBank)

```javascript
const SEED_BALANCES = {
  'USR-001': 50000,   // Ahmad (customer)
  'USR-002': 50000,   // Budi (customer)
  'USR-003': 50000,   // Citra (customer)
  'USR-004': 50000,   // Deni (kurir)
  'USR-005': 50000,   // Eka (kurir)
  'USR-006': 50000,   // Hadi (admin)
};
```

### 8.2 Service Accounts (SmartBank)

```javascript
const SEED_SERVICE_ACCOUNTS = {
  logistikita: 0,
  gateway: 0,
  reserve_bank: 0,
};
```

### 8.3 User Info (Trigger)

Trigger perlu mengetahui user info untuk generate JWT:

```javascript
const SEED_USERS = [
  { id: 'USR-001', name: 'Ahmad Pembeli',  email: 'ahmad@test.com',  role: 'customer' },
  { id: 'USR-002', name: 'Budi Pembeli',   email: 'budi@test.com',   role: 'customer' },
  { id: 'USR-003', name: 'Citra Pembeli',  email: 'citra@test.com',  role: 'customer' },
  { id: 'USR-004', name: 'Deni Kurir',     email: 'deni@test.com',   role: 'kurir' },
  { id: 'USR-005', name: 'Eka Kurir',      email: 'eka@test.com',    role: 'kurir' },
  { id: 'USR-006', name: 'Hadi Admin',     email: 'hadi@test.com',   role: 'admin' },
];
```

### 8.4 Branches (untuk referensi rute di trigger)

```javascript
const SEED_BRANCHES = [
  { id: 'BRC-001', name: 'Cabang Jakarta',    city: 'Jakarta',    lat: -6.2088, lng: 106.8456, route_order: 1 },
  { id: 'BRC-002', name: 'Cabang Bogor',      city: 'Bogor',      lat: -6.5971, lng: 106.8060, route_order: 2 },
  { id: 'BRC-003', name: 'Cabang Bandung',    city: 'Bandung',    lat: -6.9175, lng: 107.6191, route_order: 3 },
  { id: 'BRC-004', name: 'Cabang Cirebon',    city: 'Cirebon',    lat: -6.7320, lng: 108.5523, route_order: 4 },
  { id: 'BRC-005', name: 'Cabang Semarang',   city: 'Semarang',   lat: -6.9666, lng: 110.4196, route_order: 5 },
  { id: 'BRC-006', name: 'Cabang Yogyakarta', city: 'Yogyakarta', lat: -7.7956, lng: 110.3695, route_order: 6 },
  { id: 'BRC-007', name: 'Cabang Surabaya',   city: 'Surabaya',   lat: -7.2575, lng: 112.7521, route_order: 7 },
  { id: 'BRC-008', name: 'Cabang Malang',     city: 'Malang',     lat: -7.9786, lng: 112.6304, route_order: 8 },
];
```

### 8.5 Alamat Contoh (untuk trigger)

```javascript
const SAMPLE_ADDRESSES = [
  { alamat: 'Jl. Merdeka No. 10, Bandung',    lat: -6.9175, lng: 107.6191 },
  { alamat: 'Jl. Pahlawan No. 5, Surabaya',   lat: -7.2575, lng: 112.7521 },
  { alamat: 'Jl. Asia Afrika, Bandung',        lat: -6.9217, lng: 107.6094 },
  { alamat: 'Jl. Malioboro, Yogyakarta',       lat: -7.7928, lng: 110.3659 },
  { alamat: 'Jl. Sudirman, Jakarta',           lat: -6.2088, lng: 106.8234 },
  { alamat: 'Jl. Tugu, Malang',               lat: -7.9786, lng: 112.6304 },
  { alamat: 'Jl. Braga, Bandung',             lat: -6.9228, lng: 107.6093 },
  { alamat: 'Jl. Padjajaran, Bogor',          lat: -6.5971, lng: 106.7970 },
];
```

---

## 9. Skenario Test / Acceptance Test

### Skenario 1: Pengiriman Reguler Berhasil (Bandung → Surabaya)

```
Trigger: POST /trigger/marketplace
Body: user_id=USR-001, lat_asal=-6.9175, lng_asal=107.6191, lat_tujuan=-7.2575, lng_tujuan=112.7521, tipe_pengiriman=reguler

Expected:
  - jarak ≈ 681.2 km (Haversine)
  - ongkir = 681.2 × 2000 = Rp1.362.400
  - fee_layanan = FLOOR(1.362.400 × 5%) = Rp68.120
  - total_biaya = Rp1.430.520
  - rute: Bandung → Cirebon → Semarang → Yogyakarta → Surabaya
  - status: PENDING (menunggu kurir)
  - SmartBank: saldo USR-001 berkurang sebesar total_debit
```

### Skenario 2: Pengiriman Sameday Berhasil (Bandung → Bandung, dalam kota)

```
Trigger: POST /trigger/direct
Body: user_id=USR-001, lat_asal=-6.9175, lng_asal=107.6191, lat_tujuan=-6.9217, lng_tujuan=107.6094, tipe_pengiriman=sameday

Expected:
  - jarak ≈ 1.0 km
  - ongkir = 1.0 × 5000 = Rp5.000
  - fee_layanan = FLOOR(5000 × 5%) = Rp250
  - total_biaya = Rp5.250
  - rute: Cabang Bandung (saja, tidak ada transit)
  - status: PENDING
```

### Skenario 3: Sameday Gagal — Jarak Melebihi Batas

```
Trigger: POST /trigger/direct
Body: user_id=USR-001, lat_asal=-6.9175, lng_asal=107.6191, lat_tujuan=-7.2575, lng_tujuan=112.7521, tipe_pengiriman=sameday

Expected:
  - jarak ≈ 681.2 km (melebihi 50 km)
  - Response: 400, error_code=DISTANCE_EXCEEDED
  - Message: "Jarak 681.2 km melebihi batas sameday (maks 50 km)"
```

### Skenario 4: Nextday Gagal — Jarak Melebihi Batas

```
Trigger: POST /trigger/marketplace
Body: user_id=USR-002, lat_asal=-6.2088, lng_asal=106.8456, lat_tujuan=-7.2575, lng_tujuan=112.7521, tipe_pengiriman=nextday

Expected:
  - jarak ≈ 661.3 km (melebihi 250 km)
  - Response: 400, error_code=DISTANCE_EXCEEDED
```

### Skenario 5: Saldo Tidak Cukup

```
Trigger: POST /trigger/marketplace
Body: user_id=USR-003, lat_asal=-6.2088, lng_asal=106.8456, lat_tujuan=-7.2575, lng_tujuan=112.7521, tipe_pengiriman=reguler

Expected (saldo awal Rp50.000, total_debit > Rp50.000):
  - SmartBank: INSUFFICIENT_BALANCE
  - Response: 402
  - status: FAILED
```

### Skenario 6: Duplikat Order ID

```
Trigger: POST /trigger/marketplace (2x dengan user_id sama, tanpa cooldown)

Expected:
  - Request pertama: 201 sukses
  - Request kedua: 429 COOLDOWN_ACTIVE (atau 400 DUPLICATE_ORDER jika order_id sama)
```

### Skenario 7: Nextday Berhasil (Bandung → Semarang)

```
Trigger: POST /trigger/supplierhub
Body: user_id=USR-002, lat_asal=-6.9175, lng_asal=107.6191, lat_tujuan=-6.9666, lng_tujuan=110.4196, tipe_pengiriman=nextday

Expected:
  - jarak ≈ 268.3 km → GAGAL (melebihi 250 km)

Alternatif: Bandung → Cirebon
Body: lat_tujuan=-6.7320, lng_tujuan=108.5523

Expected:
  - jarak ≈ 98.4 km (di bawah 250 km)
  - ongkir = 98.4 × 3500 = Rp344.400
  - fee = FLOOR(344.400 × 5%) = Rp17.220
  - total = Rp361.620
  - rute: Bandung → Cirebon
  - status: PENDING
```

### Skenario 8: SmartBank Down (Force Error)

```
1. POST /mock/smartbank/config → { "forceError": "SYSTEM_ERROR" }
2. POST /trigger/marketplace → body normal

Expected:
  - Response: 503
  - status: PENDING (tidak berubah ke FAILED, karena bisa retry)
```

### Skenario 9: Default Tipe = Reguler

```
Trigger: POST /trigger/marketplace
Body: user_id=USR-001, lat_asal=-6.9175, lng_asal=107.6191, lat_tujuan=-6.9217, lng_tujuan=107.6094
(tanpa field tipe_pengiriman)

Expected:
  - tipe_pengiriman = "reguler" (default)
  - ongkir dihitung dengan tarif Rp2.000/km
```

---

## 10. Implementasi Kode

### 10.1 Entry Point (`index.js`)

```javascript
const smartbankApp = require('./smartbank.mock');
const gatewayApp = require('./gateway.mock');
const triggerApp = require('./trigger.mock');

const SMARTBANK_PORT = process.env.SMARTBANK_PORT || 4000;
const GATEWAY_PORT = process.env.GATEWAY_PORT || 5000;
const TRIGGER_PORT = process.env.TRIGGER_PORT || 5500;

smartbankApp.listen(SMARTBANK_PORT, () => {
  console.log(`[Mock SmartBank] Running on port ${SMARTBANK_PORT}`);
});

gatewayApp.listen(GATEWAY_PORT, () => {
  console.log(`[Mock Gateway] Running on port ${GATEWAY_PORT}`);
});

triggerApp.listen(TRIGGER_PORT, () => {
  console.log(`[Mock Trigger] Running on port ${TRIGGER_PORT}`);
});
```

### 10.2 Mock SmartBank (`smartbank.mock.js`)

```javascript
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { SEED_BALANCES, SEED_SERVICE_ACCOUNTS } = require('./data/seed');

const app = express();
app.use(express.json());

// In-memory state
let balances = { ...SEED_BALANCES };
let serviceAccounts = { ...SEED_SERVICE_ACCOUNTS };
let ledger = [];
let config = { forceError: null };

// Middleware: Log requests
app.use((req, res, next) => {
  console.log(`[SmartBank] ${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// POST /payment
app.post('/payment', (req, res) => {
  // Force error check
  if (config.forceError) {
    return res.status(config.forceError === 'SYSTEM_ERROR' ? 500 : 400).json({
      status: 'FAILED',
      error_code: config.forceError,
      message: `Forced error: ${config.forceError}`,
    });
  }

  const { from_user, to_service, amount, fee_gateway = 0, metadata } = req.body;

  // Validate user exists
  if (!(from_user in balances)) {
    return res.status(400).json({ status: 'FAILED', error_code: 'USER_NOT_FOUND' });
  }

  // Calculate fees
  const fee_bank = Math.floor(amount * 0.01);
  const pajak = Math.floor(amount * 0.02);
  const total_debit = amount + fee_bank + pajak + fee_gateway;

  // Check balance
  if (balances[from_user] < total_debit) {
    return res.status(400).json({
      status: 'FAILED',
      error_code: 'INSUFFICIENT_BALANCE',
      required: total_debit,
      available: balances[from_user],
    });
  }

  // Execute atomic transaction
  balances[from_user] -= total_debit;
  serviceAccounts[to_service] = (serviceAccounts[to_service] || 0) + amount;
  serviceAccounts['reserve_bank'] = (serviceAccounts['reserve_bank'] || 0) + fee_bank;
  serviceAccounts['gateway'] = (serviceAccounts['gateway'] || 0) + fee_gateway;

  const txId = `TRX-SBANK-${uuidv4().slice(0, 8).toUpperCase()}`;
  const record = {
    transaction_id: txId,
    timestamp: new Date().toISOString(),
    from_user,
    to_service,
    amount,
    fee_bank,
    pajak,
    fee_gateway,
    total_debit,
    new_balance: balances[from_user],
    metadata,
  };
  ledger.push(record);

  res.json({
    status: 'SUCCESS',
    transaction_id: txId,
    timestamp: record.timestamp,
    deducted_amounts: {
      pokok: amount,
      fee_bank,
      pajak_sistem: pajak,
      fee_gateway,
      total_debit,
    },
    new_balance: balances[from_user],
  });
});

// GET /smartbank/balance/:user_id
app.get('/smartbank/balance/:user_id', (req, res) => {
  const userId = req.params.user_id;
  if (!(userId in balances)) return res.status(404).json({ error: 'User not found' });
  res.json({ user_id: userId, balance: balances[userId] });
});

// GET /smartbank/ledger
app.get('/smartbank/ledger', (req, res) => {
  res.json({ total: ledger.length, entries: ledger });
});

// GET /smartbank/accounts
app.get('/smartbank/accounts', (req, res) => {
  res.json(serviceAccounts);
});

// POST /smartbank/topup
app.post('/smartbank/topup', (req, res) => {
  const { user_id, amount } = req.body;
  if (!user_id || !amount) return res.status(400).json({ error: 'user_id and amount required' });
  balances[user_id] = (balances[user_id] || 0) + amount;
  res.json({ user_id, new_balance: balances[user_id] });
});

// POST /smartbank/reset
app.post('/smartbank/reset', (req, res) => {
  balances = { ...SEED_BALANCES };
  serviceAccounts = { ...SEED_SERVICE_ACCOUNTS };
  ledger = [];
  config = { forceError: null };
  res.json({ message: 'SmartBank state reset to seed data' });
});

// POST /mock/smartbank/config
app.post('/mock/smartbank/config', (req, res) => {
  config = { ...config, ...req.body };
  res.json({ message: 'Config updated', config });
});

module.exports = app;
```

### 10.3 Mock API Gateway (`gateway.mock.js`)

```javascript
const express = require('express');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());

let logs = [];
let config = { forceError: null };

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_min_32_chars';
const SMARTBANK_URL = `http://localhost:${process.env.SMARTBANK_PORT || 4000}`;

// Middleware: Log requests
app.use((req, res, next) => {
  console.log(`[Gateway] ${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// POST /logistics/pay
app.post('/logistics/pay', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  // Validate JWT
  try {
    jwt.verify(token, JWT_SECRET);
  } catch (err) {
    logs.push({ timestamp: new Date().toISOString(), status: 'REJECTED', reason: 'Invalid JWT' });
    return res.status(401).json({ error: 'Invalid or missing JWT token' });
  }

  // Force error
  if (config.forceError) {
    return res.status(503).json({ error: `Gateway forced error: ${config.forceError}` });
  }

  // Calculate gateway fee
  const { amount } = req.body;
  const fee_gateway = Math.floor(amount * 0.005);

  // Forward to SmartBank
  const payload = { ...req.body, fee_gateway };

  try {
    const response = await fetch(`${SMARTBANK_URL}/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    logs.push({
      timestamp: new Date().toISOString(),
      request: req.body,
      fee_gateway,
      smartbank_response: data,
      status: response.ok ? 'FORWARDED' : 'SMARTBANK_ERROR',
    });

    res.status(response.status).json(data);
  } catch (err) {
    logs.push({ timestamp: new Date().toISOString(), status: 'SMARTBANK_DOWN', error: err.message });
    res.status(503).json({ error: 'SmartBank unreachable', details: err.message });
  }
});

// GET /gateway/logs
app.get('/gateway/logs', (req, res) => {
  res.json({ total: logs.length, entries: logs });
});

// POST /mock/gateway/config
app.post('/mock/gateway/config', (req, res) => {
  config = { ...config, ...req.body };
  res.json({ message: 'Config updated', config });
});

// POST /gateway/reset
app.post('/gateway/reset', (req, res) => {
  logs = [];
  config = { forceError: null };
  res.json({ message: 'Gateway state reset' });
});

module.exports = app;
```

### 10.4 Mock Trigger (`trigger.mock.js`)

```javascript
const express = require('express');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');
const { SEED_USERS, SAMPLE_ADDRESSES } = require('./data/seed');

const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_min_32_chars';
const BACKEND_URL = process.env.LOGISTIKITA_BACKEND_URL || 'http://localhost:3001';

let triggerHistory = [];

// Helper: Generate JWT
function generateToken(userId) {
  const user = SEED_USERS.find(u => u.id === userId);
  if (!user) throw new Error(`User ${userId} not found in seed data`);
  return jwt.sign(
    { user_id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

// Helper: Generate Order ID
function generateOrderId(prefix) {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const seq = String(triggerHistory.length + 1).padStart(4, '0');
  return `${prefix}-${date}-${seq}`;
}

// POST /trigger/marketplace
app.post('/trigger/marketplace', async (req, res) => {
  try {
    const { user_id, alamat_asal, lat_asal, lng_asal, alamat_tujuan, lat_tujuan, lng_tujuan, tipe_pengiriman, nilai_transaksi } = req.body;
    const token = generateToken(user_id);
    const orderId = generateOrderId('MKT');

    const payload = {
      order_id: orderId,
      user_id,
      alamat_asal: alamat_asal || 'Alamat asal marketplace',
      lat_asal, lng_asal,
      alamat_tujuan: alamat_tujuan || 'Alamat tujuan',
      lat_tujuan, lng_tujuan,
      tipe_pengiriman: tipe_pengiriman || 'reguler',
      source_app: 'marketplace',
      nilai_transaksi: nilai_transaksi || 0,
    };

    const response = await fetch(`${BACKEND_URL}/api/request_pengiriman`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    triggerHistory.push({ type: 'marketplace', payload, response: data, timestamp: new Date().toISOString() });
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /trigger/supplierhub
app.post('/trigger/supplierhub', async (req, res) => {
  try {
    const { user_id, alamat_asal, lat_asal, lng_asal, alamat_tujuan, lat_tujuan, lng_tujuan, tipe_pengiriman, nilai_transaksi } = req.body;
    const token = generateToken(user_id);
    const orderId = generateOrderId('SUP');

    const payload = {
      order_id: orderId,
      user_id,
      alamat_asal: alamat_asal || 'Gudang supplier',
      lat_asal, lng_asal,
      alamat_tujuan: alamat_tujuan || 'Alamat tujuan',
      lat_tujuan, lng_tujuan,
      tipe_pengiriman: tipe_pengiriman || 'reguler',
      source_app: 'supplierhub',
      nilai_transaksi: nilai_transaksi || 0,
    };

    const response = await fetch(`${BACKEND_URL}/api/request_pengiriman`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    triggerHistory.push({ type: 'supplierhub', payload, response: data, timestamp: new Date().toISOString() });
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /trigger/direct
app.post('/trigger/direct', async (req, res) => {
  try {
    const { user_id, alamat_asal, lat_asal, lng_asal, alamat_tujuan, lat_tujuan, lng_tujuan, tipe_pengiriman } = req.body;
    const token = generateToken(user_id);

    const payload = {
      alamat_asal: alamat_asal || 'Alamat pengirim',
      lat_asal, lng_asal,
      alamat_tujuan: alamat_tujuan || 'Alamat penerima',
      lat_tujuan, lng_tujuan,
      tipe_pengiriman: tipe_pengiriman || 'reguler',
    };

    const response = await fetch(`${BACKEND_URL}/api/pengiriman`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    triggerHistory.push({ type: 'direct', payload, response: data, timestamp: new Date().toISOString() });
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /trigger/batch
app.post('/trigger/batch', async (req, res) => {
  const { requests, cooldown_ms = 15000 } = req.body;
  const results = [];

  for (let i = 0; i < requests.length; i++) {
    const r = requests[i];
    const triggerUrl = `http://localhost:${process.env.TRIGGER_PORT || 5500}/trigger/${r.source}`;

    try {
      const response = await fetch(triggerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(r),
      });
      const data = await response.json();
      results.push({ index: i, status: response.status, data });
    } catch (err) {
      results.push({ index: i, status: 500, error: err.message });
    }

    // Cooldown between requests (except last)
    if (i < requests.length - 1) {
      await new Promise(resolve => setTimeout(resolve, cooldown_ms));
    }
  }

  res.json({ total: results.length, results });
});

// GET /trigger/status
app.get('/trigger/status', (req, res) => {
  res.json({ total: triggerHistory.length, history: triggerHistory });
});

// POST /trigger/reset
app.post('/trigger/reset', (req, res) => {
  triggerHistory = [];
  res.json({ message: 'Trigger history reset' });
});

module.exports = app;
```

### 10.5 Seed Data (`data/seed.js`)

```javascript
const SEED_BALANCES = {
  'USR-001': 50000,
  'USR-002': 50000,
  'USR-003': 50000,
  'USR-004': 50000,
  'USR-005': 50000,
  'USR-006': 50000,
};

const SEED_SERVICE_ACCOUNTS = {
  logistikita: 0,
  gateway: 0,
  reserve_bank: 0,
};

const SEED_USERS = [
  { id: 'USR-001', name: 'Ahmad Pembeli',  email: 'ahmad@test.com',  role: 'customer' },
  { id: 'USR-002', name: 'Budi Pembeli',   email: 'budi@test.com',   role: 'customer' },
  { id: 'USR-003', name: 'Citra Pembeli',  email: 'citra@test.com',  role: 'customer' },
  { id: 'USR-004', name: 'Deni Kurir',     email: 'deni@test.com',   role: 'kurir' },
  { id: 'USR-005', name: 'Eka Kurir',      email: 'eka@test.com',    role: 'kurir' },
  { id: 'USR-006', name: 'Hadi Admin',     email: 'hadi@test.com',   role: 'admin' },
];

const SEED_BRANCHES = [
  { id: 'BRC-001', name: 'Cabang Jakarta',    city: 'Jakarta',    lat: -6.2088, lng: 106.8456, route_order: 1 },
  { id: 'BRC-002', name: 'Cabang Bogor',      city: 'Bogor',      lat: -6.5971, lng: 106.8060, route_order: 2 },
  { id: 'BRC-003', name: 'Cabang Bandung',    city: 'Bandung',    lat: -6.9175, lng: 107.6191, route_order: 3 },
  { id: 'BRC-004', name: 'Cabang Cirebon',    city: 'Cirebon',    lat: -6.7320, lng: 108.5523, route_order: 4 },
  { id: 'BRC-005', name: 'Cabang Semarang',   city: 'Semarang',   lat: -6.9666, lng: 110.4196, route_order: 5 },
  { id: 'BRC-006', name: 'Cabang Yogyakarta', city: 'Yogyakarta', lat: -7.7956, lng: 110.3695, route_order: 6 },
  { id: 'BRC-007', name: 'Cabang Surabaya',   city: 'Surabaya',   lat: -7.2575, lng: 112.7521, route_order: 7 },
  { id: 'BRC-008', name: 'Cabang Malang',     city: 'Malang',     lat: -7.9786, lng: 112.6304, route_order: 8 },
];

const SAMPLE_ADDRESSES = [
  { alamat: 'Jl. Merdeka No. 10, Bandung',    lat: -6.9175, lng: 107.6191 },
  { alamat: 'Jl. Pahlawan No. 5, Surabaya',   lat: -7.2575, lng: 112.7521 },
  { alamat: 'Jl. Asia Afrika, Bandung',        lat: -6.9217, lng: 107.6094 },
  { alamat: 'Jl. Malioboro, Yogyakarta',       lat: -7.7928, lng: 110.3659 },
  { alamat: 'Jl. Sudirman, Jakarta',           lat: -6.2088, lng: 106.8234 },
  { alamat: 'Jl. Tugu, Malang',               lat: -7.9786, lng: 112.6304 },
  { alamat: 'Jl. Braga, Bandung',             lat: -6.9228, lng: 107.6093 },
  { alamat: 'Jl. Padjajaran, Bogor',          lat: -6.5971, lng: 106.7970 },
];

module.exports = {
  SEED_BALANCES,
  SEED_SERVICE_ACCOUNTS,
  SEED_USERS,
  SEED_BRANCHES,
  SAMPLE_ADDRESSES,
};
```

---

## 11. Acceptance Criteria

### Mock SmartBank

- [ ] Menghitung `fee_bank (1%)` dan `pajak (2%)` dengan benar menggunakan `FLOOR()`
- [ ] Mengeksekusi debit/kredit atomik ke `balances` dan `serviceAccounts`
- [ ] Menolak transaksi jika saldo tidak cukup (`INSUFFICIENT_BALANCE`)
- [ ] Menolak transaksi jika user tidak ditemukan (`USER_NOT_FOUND`)
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

- [ ] Meng-generate JWT token valid untuk `user_id` yang diberikan (termasuk `role` dari seed data)
- [ ] Meneruskan request ke LogistiKita backend dengan `source_app: "marketplace"` atau `"supplierhub"`
- [ ] Mendukung trigger `direct` yang POST ke `/api/pengiriman` (endpoint user langsung)
- [ ] Mengirim koordinat (`lat_asal`, `lng_asal`, `lat_tujuan`, `lng_tujuan`) di request body
- [ ] Mengirim `tipe_pengiriman` (default: `"reguler"` jika tidak disertakan)
- [ ] Menyediakan endpoint batch trigger dengan jeda cooldown otomatis antar request
- [ ] Mengembalikan response LogistiKita secara transparan ke pemanggil

### Umum

- [ ] Semua mock berjalan dari satu perintah `npm start`
- [ ] State dapat di-reset kapan saja via endpoint `/reset`
- [ ] Semua request dicatat ke console dengan timestamp
- [ ] JWT_SECRET di mock server identik dengan backend agar token kompatibel
- [ ] Seed data user (6 user: 3 customer, 2 kurir, 1 admin) konsisten dengan backend
- [ ] Seed data cabang (8 cabang di Pulau Jawa) konsisten dengan backend

---

*PRD Mock Server ini merupakan bagian dari ekosistem LogistiKita. Lihat [PRD-backend.md](./PRD-backend.md) untuk spesifikasi backend dan [README.md](./README.md) untuk gambaran keseluruhan sistem.*
