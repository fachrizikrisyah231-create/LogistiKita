# PRD Backend — LogistiKita

> **Dokumen:** Product Requirements Document (Backend)
> **Proyek:** LogistiKita — Aplikasi Manajemen Pengiriman Barang
> **Mata Kuliah:** Rekayasa Perangkat Lunak 2
> **Stack Backend:** Node.js + Express.js | MySQL 8.x | JWT Auth | bcrypt
> **Versi:** 2.0.0 | Tanggal: 2026-06-17

---

## Daftar Isi

1. [Overview & Tujuan](#1-overview--tujuan)
2. [Arsitektur Backend](#2-arsitektur-backend)
3. [Struktur Direktori Backend](#3-struktur-direktori-backend)
4. [Environment & Konfigurasi](#4-environment--konfigurasi)
5. [Authentication & Middleware](#5-authentication--middleware)
6. [API Contract Lengkap](#6-api-contract-lengkap)
7. [Business Logic & Rules](#7-business-logic--rules)
8. [Integrasi SmartBank via API Gateway](#8-integrasi-smartbank-via-api-gateway)
9. [Database Schema & SQL](#9-database-schema--sql)
10. [Error Handling & Response Standard](#10-error-handling--response-standard)
11. [Alur Eksekusi Per Fitur](#11-alur-eksekusi-per-fitur)
12. [Acceptance Criteria](#12-acceptance-criteria)

---

## 1. Overview & Tujuan

**LogistiKita** backend adalah microservice yang bertanggung jawab atas:
- **Autentikasi** — Login & register user (customer, kurir, admin)
- **Manajemen pengiriman** — Dari user langsung (via UI) maupun dari Marketplace/SupplierHub (via API)
- **Kalkulasi ongkir** — Berdasarkan jarak (Haversine) × tarif per km per tipe pengiriman
- **Routing cabang** — Menentukan cabang transit otomatis berdasarkan geografi
- **Tracking** — Status tracking publik (tanpa login) melalui rute cabang
- **Dashboard kurir** — Endpoint untuk aksi kurir (pickup, transit, delivery)
- **Dashboard admin** — Endpoint untuk overview, keuangan, manajemen data

### Batasan Scope Backend

| Aspek | Ketentuan |
|---|---|
| **Pembayaran** | Didelegasikan ke SmartBank via API Gateway |
| **Saldo** | Tidak menyimpan/memanipulasi saldo user |
| **User Management** | Mengelola login/register/role sendiri (bukan dari SmartBank) |
| **Tracking** | Endpoint tracking **publik** (tanpa JWT), bisa diakses siapa saja |

### Prinsip Desain

- **Stateless API**: JWT token untuk identitas; tidak ada server-side session
- **Role-based Access Control**: Middleware per role (customer, kurir, admin)
- **Audit Trail**: Setiap transaksi dicatat di `transaction_logs`
- **Idempotency**: `order_id` bersifat unik; duplikat ditolak

---

## 2. Arsitektur Backend

```
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL TRIGGERS                            │
│         Marketplace (PasarKita)   SupplierHub                   │
│                    + User Langsung (via Frontend)                │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│              LOGISTIKITA BACKEND (Express.js)                   │
│                                                                 │
│  Routes → Middleware → Controllers → Services → Models → MySQL  │
│                                                                 │
│  AUTH:                                                          │
│  │  POST /api/auth/register      →  authController                 │
│  │  POST /api/auth/login         →  authController                 │
│  │  GET  /api/auth/me            →  authController                 │
│                                                                 │
│  PENGIRIMAN:                                                    │
│  │  POST /pengiriman         →  userShipmentController         │
│  │  GET  /pengiriman-saya    →  userShipmentController         │
│  │  POST /request-pengiriman →  shipmentController             │
│  │  POST /estimasi-ongkir    →  costController                 │
│  │  GET  /tracking/:order_id →  trackingController (PUBLIC)    │
│                                                                 │
│  KURIR:                                                         │
│  │  GET  /kurir/tugas        →  kurirController                │
│  │  PUT  /kurir/pickup/:id   →  kurirController                │
│  │  PUT  /kurir/tiba-cabang  →  kurirController                │
│  │  PUT  /kurir/delivered    →  kurirController                │
│  │  ...                                                        │
│                                                                 │
│  ADMIN:                                                         │
│  │  GET  /admin/overview     →  adminController                │
│  │  GET  /admin/keuangan     →  adminController                │
│  │  GET  /admin/shipments    →  adminController                │
│  │  ...                                                        │
│                                                                 │
│  Middleware: authMiddleware | roleMiddleware | rateLimitMiddleware│
└──────────────────────┬──────────────────────────────────────────┘
                       │ POST /logistics/pay (via Gateway)
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SMARTBANK (Core)                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Struktur Direktori Backend

```
backend/
├── src/
│   ├── controllers/
│   │   ├── authController.js            # Login, register, me
│   │   ├── shipmentController.js        # POST /request-pengiriman (dari app lain)
│   │   ├── userShipmentController.js    # POST /pengiriman, GET /pengiriman-saya (user langsung)
│   │   ├── trackingController.js        # GET /tracking/:order_id (publik)
│   │   ├── costController.js            # POST /estimasi-ongkir
│   │   ├── feeController.js             # Kalkulasi fee layanan (internal)
│   │   ├── paymentController.js         # Pembayaran ke SmartBank (internal)
│   │   ├── kurirController.js           # Semua endpoint kurir
│   │   └── adminController.js           # Semua endpoint admin
│   │
│   ├── services/
│   │   ├── authService.js               # Logika auth (bcrypt, JWT)
│   │   ├── shipmentService.js           # Orkestrasi alur pengiriman
│   │   ├── costCalculatorService.js     # Kalkulasi ongkir + fee
│   │   ├── haversineService.js          # Hitung jarak Haversine
│   │   ├── routingService.js            # Routing cabang otomatis
│   │   └── smartbankService.js          # HTTP client ke SmartBank
│   │
│   ├── models/
│   │   ├── User.js
│   │   ├── Shipment.js
│   │   ├── Branch.js
│   │   ├── ShipmentRoute.js
│   │   ├── TrackingLog.js
│   │   └── TransactionLog.js
│   │
│   ├── middleware/
│   │   ├── authMiddleware.js            # JWT validation & user extraction
│   │   ├── roleMiddleware.js            # Role-based access control
│   │   └── rateLimitMiddleware.js       # Cooldown + daily limit
│   │
│   ├── routes/
│   │   └── logistikitaRoutes.js         # Semua route & middleware chain
│   │
│   ├── config/
│   │   └── database.js                  # MySQL connection pool
│   │
│   ├── utils/
│   │   ├── responseHelper.js
│   │   └── logger.js
│   │
│   └── app.js                           # Express entry point
│
├── .env
├── .env.example
└── package.json
```

---

## 4. Environment & Konfigurasi

### `backend/.env`

```env
# ─── Server ───────────────────────────────────────────────────
PORT=3001
NODE_ENV=development

# ─── Database (MySQL) ─────────────────────────────────────────
DB_HOST=localhost
DB_PORT=3306
DB_USER=logistikita_user
DB_PASSWORD=secret
DB_NAME=logistikita_db
DB_CONNECTION_LIMIT=10

# ─── Authentication ───────────────────────────────────────────
JWT_SECRET=your_jwt_secret_key_min_32_chars
JWT_EXPIRES_IN=24h
BCRYPT_ROUNDS=10

# ─── External Services ────────────────────────────────────────
SMARTBANK_BASE_URL=http://localhost:4000
GATEWAY_BASE_URL=http://localhost:5000
GATEWAY_API_KEY=gateway_service_key

# ─── Ongkir per km (per tipe pengiriman) ──────────────────────
ONGKIR_REGULER_PER_KM=2000
ONGKIR_NEXTDAY_PER_KM=3500
ONGKIR_SAMEDAY_PER_KM=5000

# ─── Batas jarak per tipe ─────────────────────────────────────
SAMEDAY_MAX_KM=50
NEXTDAY_MAX_KM=250

# ─── Fee ──────────────────────────────────────────────────────
FEE_LAYANAN_PERCENTAGE=0.05

# ─── Rate Limiting ────────────────────────────────────────────
COOLDOWN_SECONDS_MIN=10
COOLDOWN_SECONDS_MAX=30
MAX_DAILY_TRANSACTIONS=10
```

---

## 5. Authentication & Middleware

### 5.1 Auth Middleware (`authMiddleware.js`)

Memvalidasi JWT token dari header `Authorization`.

```javascript
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, error: { code: 'MISSING_TOKEN' } });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { user_id, email, role }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN' } });
  }
};
```

### 5.2 Role Middleware (`roleMiddleware.js`)

Membatasi akses berdasarkan role user.

```javascript
const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Anda tidak memiliki akses ke resource ini.' }
      });
    }
    next();
  };
};

// Penggunaan:
// router.get('/kurir/tugas', authMiddleware, roleMiddleware('kurir'), kurirController.getTugas);
// router.get('/admin/overview', authMiddleware, roleMiddleware('admin'), adminController.getOverview);
```

### 5.3 Rate Limit Middleware (`rateLimitMiddleware.js`)

Diterapkan pada endpoint pembuatan pengiriman.

| Rule | Value | Error Code |
|---|---|---|
| Cooldown antar transaksi | 10–30 detik | `COOLDOWN_ACTIVE` |
| Maksimum transaksi/hari | 10 per user | `DAILY_LIMIT_EXCEEDED` |

### 5.4 Route Middleware Chain

```javascript
// Auth endpoints (no middleware)
router.post('/api/auth/register', authController.register);
router.post('/api/auth/login', authController.login);
router.get('/api/auth/me', authMiddleware, authController.me);

// Public endpoints
router.get('/api/tracking/:order_id', trackingController.getTracking);
router.post('/api/estimasi-ongkir', costController.estimasi);
router.get('/api/cabang/list', branchController.list);

// Customer endpoints
router.post('/api/pengiriman', authMiddleware, roleMiddleware('customer'), rateLimitMiddleware, userShipmentController.create);
router.get('/api/pengiriman-saya', authMiddleware, roleMiddleware('customer'), userShipmentController.list);

// API trigger (from Marketplace/SupplierHub)
router.post('/api/request-pengiriman', authMiddleware, rateLimitMiddleware, shipmentController.create);

// Kurir endpoints
router.get('/api/kurir/tugas', authMiddleware, roleMiddleware('kurir'), kurirController.getTugas);
router.get('/api/kurir/riwayat', authMiddleware, roleMiddleware('kurir'), kurirController.getRiwayat);
router.put('/api/kurir/pickup/:shipment_id', authMiddleware, roleMiddleware('kurir'), kurirController.pickup);
router.put('/api/kurir/tiba-cabang/:shipment_id', authMiddleware, roleMiddleware('kurir'), kurirController.tibaCabang);
router.put('/api/kurir/lanjut-transit/:shipment_id', authMiddleware, roleMiddleware('kurir'), kurirController.lanjutTransit);
router.put('/api/kurir/antar/:shipment_id', authMiddleware, roleMiddleware('kurir'), kurirController.antar);
router.put('/api/kurir/delivered/:shipment_id', authMiddleware, roleMiddleware('kurir'), kurirController.delivered);
router.put('/api/kurir/gagal/:shipment_id', authMiddleware, roleMiddleware('kurir'), kurirController.gagal);

// Admin endpoints
router.get('/api/admin/overview', authMiddleware, roleMiddleware('admin'), adminController.getOverview);
router.get('/api/admin/keuangan', authMiddleware, roleMiddleware('admin'), adminController.getKeuangan);
router.get('/api/admin/shipments', authMiddleware, roleMiddleware('admin'), adminController.getShipments);
router.put('/api/admin/shipments/:id/status', authMiddleware, roleMiddleware('admin'), adminController.updateStatus);
router.put('/api/admin/shipments/:id/assign-kurir', authMiddleware, roleMiddleware('admin'), adminController.assignKurir);
router.get('/api/admin/users', authMiddleware, roleMiddleware('admin'), adminController.getUsers);
router.post('/api/admin/users', authMiddleware, roleMiddleware('admin'), adminController.createUser);
router.put('/api/admin/users/:id', authMiddleware, roleMiddleware('admin'), adminController.updateUser);
router.get('/api/admin/cabang', authMiddleware, roleMiddleware('admin'), adminController.getCabang);
router.post('/api/admin/cabang', authMiddleware, roleMiddleware('admin'), adminController.createCabang);
router.put('/api/admin/cabang/:id', authMiddleware, roleMiddleware('admin'), adminController.updateCabang);
router.get('/api/admin/kurir', authMiddleware, roleMiddleware('admin'), adminController.getKurirList);
```

---

## 6. API Contract Lengkap

> **Base URL:** `http://localhost:3001`
> Lihat [README.md §9](./README.md#9-api-endpoint-contract) untuk contract detail dengan request/response body.

### Ringkasan Endpoint

| # | Method | Endpoint | Auth | Role | Deskripsi |
|---|---|---|---|---|---|
| 1 | POST | `/api/auth/register` | ❌ | — | Register customer |
| 2 | POST | `/api/auth/login` | ❌ | — | Login |
| 3 | GET | `/api/auth/me` | JWT | any | Info user login |
| 4 | POST | `/api/pengiriman` | JWT | customer | Buat pengiriman (user) |
| 5 | GET | `/api/pengiriman-saya` | JWT | customer | List pengiriman user |
| 6 | POST | `/api/request-pengiriman` | JWT | — | Request dari app lain |
| 7 | POST | `/api/estimasi-ongkir` | ❌ | — | Estimasi ongkir |
| 8 | GET | `/api/tracking/:order_id` | ❌ | — | Tracking publik |
| 9 | GET | `/api/cabang/list` | ❌ | — | List cabang |
| 10 | GET | `/api/kurir/tugas` | JWT | kurir | Tugas aktif |
| 11 | GET | `/api/kurir/riwayat` | JWT | kurir | Riwayat selesai |
| 12 | PUT | `/api/kurir/pickup/:id` | JWT | kurir | Pickup |
| 13 | PUT | `/api/kurir/tiba-cabang/:id` | JWT | kurir | Tiba di cabang |
| 14 | PUT | `/api/kurir/lanjut-transit/:id` | JWT | kurir | Lanjut transit |
| 15 | PUT | `/api/kurir/antar/:id` | JWT | kurir | Antar ke penerima |
| 16 | PUT | `/api/kurir/delivered/:id` | JWT | kurir | Tandai diterima |
| 17 | PUT | `/api/kurir/gagal/:id` | JWT | kurir | Lapor gagal |
| 18 | GET | `/api/admin/overview` | JWT | admin | Overview data |
| 19 | GET | `/api/admin/keuangan` | JWT | admin | Keuangan & revenue |
| 20 | GET | `/api/admin/shipments` | JWT | admin | Semua pengiriman |
| 21 | PUT | `/api/admin/shipments/:id/status` | JWT | admin | Ubah status |
| 22 | PUT | `/api/admin/shipments/:id/assign-kurir` | JWT | admin | Assign kurir |
| 23 | GET | `/api/admin/users` | JWT | admin | Semua user |
| 24 | POST | `/api/admin/users` | JWT | admin | Tambah user |
| 25 | PUT | `/api/admin/users/:id` | JWT | admin | Edit user |
| 26 | GET | `/api/admin/cabang` | JWT | admin | Semua cabang |
| 27 | POST | `/api/admin/cabang` | JWT | admin | Tambah cabang |
| 28 | PUT | `/api/admin/cabang/:id` | JWT | admin | Edit cabang |
| 29 | GET | `/api/admin/kurir` | JWT | admin | Kurir + performa |

---

## 7. Business Logic & Rules

### 7.1 Kalkulasi Ongkir

**Formula:**
```
ongkir = jarak_km × tarif_per_km[tipe_pengiriman]
```

**Implementasi:**
```javascript
function hitungOngkir(jarakKm, tipePengiriman) {
  const TARIF = {
    reguler: parseInt(process.env.ONGKIR_REGULER_PER_KM) || 2000,
    nextday: parseInt(process.env.ONGKIR_NEXTDAY_PER_KM) || 3500,
    sameday: parseInt(process.env.ONGKIR_SAMEDAY_PER_KM) || 5000,
  };
  return Math.floor(jarakKm * TARIF[tipePengiriman]);
}
```

### 7.2 Validasi Batas Jarak

```javascript
function validasiBatasJarak(jarakKm, tipePengiriman) {
  const BATAS = {
    sameday: parseInt(process.env.SAMEDAY_MAX_KM) || 50,
    nextday: parseInt(process.env.NEXTDAY_MAX_KM) || 250,
    reguler: Infinity,
  };
  if (jarakKm > BATAS[tipePengiriman]) {
    throw new Error(`Jarak ${jarakKm} km melebihi batas ${tipePengiriman} (maks ${BATAS[tipePengiriman]} km)`);
  }
}
```

### 7.3 Kalkulasi Fee Layanan

```javascript
function hitungFeeLayanan(ongkir) {
  const FEE_PERCENTAGE = parseFloat(process.env.FEE_LAYANAN_PERCENTAGE) || 0.05;
  return Math.floor(ongkir * FEE_PERCENTAGE);
}
```

### 7.4 Haversine Distance (`haversineService.js`)

```javascript
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371; // Radius bumi (km)
  const toRad = (deg) => deg * (Math.PI / 180);
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c * 10) / 10; // 1 desimal
}
```

### 7.5 Routing Cabang (`routingService.js`)

```javascript
async function hitungRute(latAsal, lngAsal, latTujuan, lngTujuan) {
  const branches = await Branch.getAllActive(); // sorted by route_order

  // 1. Cari cabang terdekat ke asal
  const cabangAsal = findNearestBranch(branches, latAsal, lngAsal);

  // 2. Cari cabang terdekat ke tujuan
  const cabangTujuan = findNearestBranch(branches, latTujuan, lngTujuan);

  // 3. Buat rute
  if (cabangAsal.route_order === cabangTujuan.route_order) {
    return [cabangAsal]; // Tidak ada transit
  }

  const start = Math.min(cabangAsal.route_order, cabangTujuan.route_order);
  const end = Math.max(cabangAsal.route_order, cabangTujuan.route_order);

  let rute = branches.filter(b => b.route_order >= start && b.route_order <= end);

  // Jika asal > tujuan (timur ke barat), balik urutan
  if (cabangAsal.route_order > cabangTujuan.route_order) {
    rute = rute.reverse();
  }

  return rute;
}

function findNearestBranch(branches, lat, lng) {
  let nearest = null;
  let minDist = Infinity;
  for (const b of branches) {
    const dist = haversine(lat, lng, b.latitude, b.longitude);
    if (dist < minDist) {
      minDist = dist;
      nearest = b;
    }
  }
  return nearest;
}
```

### 7.6 Auth Service (`authService.js`)

```javascript
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

async function register(name, email, password) {
  const hash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 10);
  const user = await User.create({ name, email, password: hash, role: 'customer' });
  const token = generateToken(user);
  return { token, user };
}

async function login(email, password) {
  const user = await User.findByEmail(email);
  if (!user) throw new Error('Email atau password salah.');
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new Error('Email atau password salah.');
  const token = generateToken(user);
  return { token, user };
}

function generateToken(user) {
  return jwt.sign(
    { user_id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
}
```

---

## 8. Integrasi SmartBank via API Gateway

*(Sama seperti di README.md §10 — lihat dokumen tersebut untuk detail payload, response, dan error handling.)*

### Ringkasan Alur

```
LogistiKita → POST /logistics/pay → API Gateway (fee 0.5%) → SmartBank (fee bank 1% + pajak 2%)
```

### Contoh: Pengiriman Reguler 12.5 km

```
ongkir        : 12.5 × 2000 = Rp25.000
fee_layanan   : 25.000 × 5% = Rp1.250
total_biaya   : Rp26.250

→ Gateway fee  : Rp131
→ Bank fee     : Rp262
→ Pajak        : Rp525
→ Total debit  : Rp27.168
```

---

## 9. Database Schema & SQL

*(Lihat README.md §11 untuk DDL lengkap.)*

### Ringkasan Tabel

| Tabel | Deskripsi | Kolom Kunci |
|---|---|---|
| `users` | Semua user (customer, kurir, admin) | id, email, password, role, branch_id |
| `branches` | Cabang logistik (checkpoint tracking) | id, name, city, lat, lng, route_order |
| `shipments` | Data pengiriman | id, order_id, user_id, tipe_pengiriman, alamat, koordinat, jarak, biaya, status, kurir, cabang |
| `shipment_routes` | Rute cabang per pengiriman | shipment_id, branch_id, sequence, arrived_at, departed_at |
| `tracking_logs` | Riwayat perubahan status | shipment_id, status, keterangan, branch_id |
| `transaction_logs` | Audit trail pembayaran | shipment_id, amount, payment_status, smartbank_response |

### Status Enum

```sql
ENUM('PENDING', 'PICKUP', 'IN_TRANSIT', 'AT_BRANCH', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED')
```

---

## 10. Error Handling & Response Standard

### Standard Response Format

**Sukses:**
```json
{ "success": true, "data": { ... } }
```

**Gagal:**
```json
{ "success": false, "error": { "code": "ERROR_CODE", "message": "Pesan." } }
```

### HTTP Status Codes

| Code | Kode Error | Kondisi |
|---|---|---|
| 200 | — | Sukses (GET/PUT) |
| 201 | — | Created (POST) |
| 400 | `VALIDATION_ERROR` | Input tidak valid |
| 400 | `DUPLICATE_ORDER` | order_id duplikat |
| 400 | `DISTANCE_EXCEEDED` | Jarak melebihi batas tipe pengiriman |
| 401 | `MISSING_TOKEN` | Tidak ada token |
| 401 | `INVALID_TOKEN` | Token expired/invalid |
| 402 | `PAYMENT_FAILED` | SmartBank menolak |
| 403 | `FORBIDDEN` | Role tidak sesuai |
| 404 | `SHIPMENT_NOT_FOUND` | Data tidak ditemukan |
| 404 | `USER_NOT_FOUND` | User tidak ditemukan |
| 409 | `EMAIL_EXISTS` | Email sudah terdaftar (register) |
| 429 | `DAILY_LIMIT_EXCEEDED` | Melebihi 10 tx/hari |
| 429 | `COOLDOWN_ACTIVE` | Terlalu cepat |
| 500 | `INTERNAL_ERROR` | Error server |
| 503 | `SMARTBANK_DOWN` | SmartBank tidak tersedia |

---

## 11. Alur Eksekusi Per Fitur

### 11.1 Register

```
POST /api/auth/register
  → Validasi input (name, email, password)
  → Cek email unik
  → Hash password (bcrypt)
  → INSERT user (role=customer)
  → Generate JWT
  → Response 201
```

### 11.2 Login

```
POST /api/auth/login
  → Validasi input (email, password)
  → SELECT user by email
  → bcrypt.compare password
  → Generate JWT
  → Response 200
```

### 11.3 Buat Pengiriman (User)

```
POST /api/pengiriman
  │
  ▼
[1] authMiddleware (JWT → user_id, role=customer)
  │ FAIL → 401
  ▼
[2] rateLimitMiddleware (daily + cooldown)
  │ FAIL → 429
  ▼
[3] Validasi input (alamat, koordinat, tipe)
  │ FAIL → 400
  ▼
[4] Haversine: hitung jarak dari koordinat
  ▼
[5] Validasi batas jarak (sameday ≤50, nextday ≤250)
  │ FAIL → 400 DISTANCE_EXCEEDED
  ▼
[6] hitungOngkir(jarak, tipe) + hitungFeeLayanan(ongkir)
  ▼
[7] routingService: hitung rute cabang
  ▼
[8] Generate order_id unik
  ▼
[9] INSERT shipment (status=PENDING) + INSERT shipment_routes + INSERT tracking_log (PENDING)
  ▼
[10] POST /logistics/pay → Gateway → SmartBank
  │
  ├─ SUCCESS → UPDATE status=PENDING (menunggu kurir), INSERT tracking_log, INSERT transaction_log
  │            Response 201
  │
  └─ FAILED → UPDATE status=FAILED, INSERT tracking_log, INSERT transaction_log
              Response 402
```

### 11.4 Tracking (Publik)

```
GET /api/tracking/:order_id
  │
  ▼
[1] Validasi order_id tidak kosong
  ▼
[2] SELECT shipment WHERE order_id = ?
  │ NOT FOUND → 404
  ▼
[3] SELECT shipment_routes + branches (JOIN)
  ▼
[4] SELECT tracking_logs ORDER BY created_at ASC
  ▼
[5] Response 200 (status, rute cabang + progress, riwayat)
```

### 11.5 Kurir Pickup

```
PUT /api/kurir/pickup/:shipment_id
  │
  ▼
[1] authMiddleware + roleMiddleware('kurir')
  ▼
[2] SELECT shipment WHERE id = ? AND assigned_kurir_id = req.user.user_id AND status = 'PENDING'
  │ NOT FOUND → 404 / 403
  ▼
[3] UPDATE shipment: status = 'PICKUP' then 'IN_TRANSIT'
[4] INSERT tracking_log: PICKUP
[5] INSERT tracking_log: IN_TRANSIT + "Menuju [cabang pertama]"
  ▼
[6] Response 200
```

### 11.6 Kurir Tiba di Cabang

```
PUT /api/kurir/tiba-cabang/:shipment_id
  │
  ▼
[1] authMiddleware + roleMiddleware('kurir')
  ▼
[2] SELECT shipment WHERE id = ? AND status = 'IN_TRANSIT'
  ▼
[3] Tentukan cabang berikutnya dari shipment_routes (sequence)
[4] UPDATE shipment: status = 'AT_BRANCH', current_branch_id = branch_id
[5] UPDATE shipment_routes: arrived_at = NOW() WHERE sequence = next
[6] INSERT tracking_log: AT_BRANCH + "Tiba di [nama cabang]"
  ▼
[7] Response 200
```

### 11.7 Admin Overview

```
GET /api/admin/overview
  │
  ▼
[1] authMiddleware + roleMiddleware('admin')
  ▼
[2] COUNT(shipments) → total_pengiriman
[3] COUNT(WHERE status NOT IN DELIVERED/FAILED) → aktif
[4] SUM(total_biaya WHERE status IN SUCCESS) → revenue
[5] COUNT(users WHERE role=kurir) → total_kurir
[6] GROUP BY DATE(created_at) LIMIT 7 → tren harian
[7] GROUP BY status → distribusi status
[8] GROUP BY current_branch_id → per cabang
  ▼
[9] Response 200
```

### 11.8 Admin Keuangan

```
GET /api/admin/keuangan
  │
  ▼
[1] authMiddleware + roleMiddleware('admin')
  ▼
[2] SUM(ongkir) → total_ongkir
[3] SUM(fee_layanan) → total_fee (keuntungan LogistiKita)
[4] SUM(total_biaya) → total_ditagih
[5] AVG(ongkir) → rata_rata
[6] GROUP BY DATE(created_at) → revenue harian (chart)
[7] GROUP BY tipe_pengiriman → breakdown per tipe (chart)
  ▼
[8] Response 200
```

---

## 12. Acceptance Criteria

### Auth

- [ ] Register customer berhasil dengan bcrypt hash
- [ ] Register menolak email duplikat (409)
- [ ] Login mengembalikan JWT token dengan role
- [ ] `/api/auth/me` mengembalikan info user dari token

### Pengiriman (User)

- [ ] Customer bisa buat pengiriman via `POST /pengiriman`
- [ ] Jarak dihitung otomatis via Haversine
- [ ] Validasi batas jarak per tipe: Sameday ≤ 50 km, Nextday ≤ 250 km
- [ ] Ongkir dihitung: jarak × tarif per km
- [ ] Fee layanan: 5% dari ongkir
- [ ] Rute cabang dihitung otomatis
- [ ] Pembayaran dikirim ke SmartBank
- [ ] `GET /pengiriman-saya` hanya menampilkan milik user yang login

### Pengiriman (API)

- [ ] Menerima request dari Marketplace/SupplierHub via `POST /request-pengiriman`
- [ ] Default tipe = reguler jika tidak dikirim
- [ ] Duplikat order_id ditolak

### Tracking

- [ ] `GET /tracking/:order_id` tidak memerlukan JWT
- [ ] Menampilkan rute cabang + status arrived/departed per cabang
- [ ] Menampilkan riwayat status lengkap

### Kurir

- [ ] Hanya kurir yang bisa akses endpoint kurir (role check)
- [ ] Pickup mengubah status PENDING → PICKUP → IN_TRANSIT
- [ ] Tiba di cabang mengubah status → AT_BRANCH + catat cabang
- [ ] Lanjut transit dari AT_BRANCH → IN_TRANSIT (jika belum cabang tujuan)
- [ ] Antar ke penerima dari AT_BRANCH → OUT_FOR_DELIVERY (jika cabang tujuan)
- [ ] Delivered mengubah status → DELIVERED
- [ ] Setiap aksi tercatat di tracking_logs

### Admin

- [ ] Overview mengembalikan summary cards + data chart
- [ ] Keuangan mengembalikan revenue + breakdown per tipe
- [ ] CRUD users berfungsi (tambah kurir/admin)
- [ ] CRUD cabang berfungsi
- [ ] Assign kurir ke paket berfungsi
- [ ] Ubah status shipment berfungsi

### Non-Functional

- [ ] Rate limiting: max 10 tx/hari, cooldown 10 detik
- [ ] Semua transaksi tercatat di transaction_logs
- [ ] Response time < 3 detik
- [ ] Password di-hash dengan bcrypt

---

*PRD Backend ini mengacu pada [README.md](./README.md) sebagai dokumen acuan utama.*
