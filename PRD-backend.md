# PRD Backend — LogistiKita

> **Dokumen:** Product Requirements Document (Backend)
> **Proyek:** LogistiKita — Aplikasi Manajemen Pengiriman Barang
> **Mata Kuliah:** Rekayasa Perangkat Lunak 2
> **Stack Backend:** Node.js + Express.js | MySQL 8.x | JWT Auth
> **Versi:** 1.0.0 | Tanggal: 2026-06-03

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
9. [Database Schema & SQL Query](#9-database-schema--sql-query)
10. [Error Handling & Response Standard](#10-error-handling--response-standard)
11. [Rate Limiting & Validasi Keuangan](#11-rate-limiting--validasi-keuangan)
12. [Alur Eksekusi Per Fitur (Flow Diagram)](#12-alur-eksekusi-per-fitur-flow-diagram)
13. [Acceptance Criteria](#13-acceptance-criteria)

---

## 1. Overview & Tujuan

**LogistiKita** adalah microservice backend yang bertanggung jawab atas manajemen pengiriman barang dalam ekosistem simulasi ekonomi UMKM. Backend ini berperan sebagai **cost driver** — menerima order dari service eksternal (Marketplace/SupplierHub), menghitung biaya pengiriman, mendelegasikan pembayaran ke SmartBank melalui API Gateway, dan menyediakan data tracking untuk user.

### Batasan Scope Backend

| Aspek | Ketentuan |
|---|---|
| **Pembayaran** | Tidak memproses pembayaran langsung; semua didelegasikan ke SmartBank via API Gateway |
| **Saldo** | Tidak menyimpan atau memanipulasi saldo user secara langsung |
| **Inisiasi Transaksi** | Hanya menerima trigger dari Marketplace atau SupplierHub |
| **Komunikasi** | Semua request ke SmartBank wajib melalui API Gateway (JWT + logging) |
| **User Management** | Tidak mengelola registrasi user; hanya menyimpan referensi `user_id` dari SmartBank |

### Prinsip Desain

- **Stateless API**: Setiap request membawa JWT token yang berisi identitas; backend tidak menyimpan session
- **Single Responsibility**: Setiap controller & service menangani satu tanggung jawab
- **Audit Trail**: Setiap percobaan transaksi (sukses/gagal) dicatat di `transaction_logs`
- **Idempotency**: `order_id` bersifat unik; duplikat request ditolak dengan error `DUPLICATE_ORDER`

---

## 2. Arsitektur Backend

```
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL TRIGGERS                            │
│         Marketplace (PasarKita)   SupplierHub                   │
└──────────────────────┬──────────────────────┘
                       │ POST /logistikita/request_pengiriman
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API GATEWAY                                 │
│  - JWT Validation                                               │
│  - Request Logging                                              │
│  - Fee Gateway (0.5%)                                           │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│              LOGISTIKITA BACKEND (Express.js)                   │
│                                                                 │
│  Routes → Controllers → Services → Models → MySQL              │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  POST /request_pengiriman  →  shipmentController         │  │
│  │  POST /biaya_pengiriman    →  costController (internal)  │  │
│  │  POST /pembayaran_logistik →  paymentController          │  │
│  │  GET  /tracking_status     →  trackingController         │  │
│  │  POST /biaya_layanan       →  feeController (internal)   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Middleware: authMiddleware | rateLimitMiddleware | logger      │
└──────────────────────┬──────────────────────┘
                       │ POST /logistics/pay (via Gateway)
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SMARTBANK (Core)                             │
│  - Validasi saldo                                               │
│  - Debit/Kredit                                                 │
│  - Fee Bank (1%) + Pajak Sistem (2%)                            │
│  - Ledger recording                                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Struktur Direktori Backend

```
backend/
├── src/
│   ├── controllers/
│   │   ├── shipmentController.js       # POST /request_pengiriman
│   │   ├── trackingController.js       # GET  /tracking_status
│   │   ├── paymentController.js        # POST /pembayaran_logistik (internal)
│   │   ├── costController.js           # POST /biaya_pengiriman (internal + mock)
│   │   └── feeController.js            # POST /biaya_layanan_logistik (internal)
│   │
│   ├── services/
│   │   ├── shipmentService.js          # Orkestrasi alur utama pengiriman
│   │   ├── costCalculatorService.js    # Logika kalkulasi ongkir & fee
│   │   └── smartbankService.js         # HTTP client ke SmartBank via Gateway
│   │
│   ├── models/
│   │   ├── Shipment.js                 # CRUD model tabel shipments
│   │   ├── TrackingLog.js              # CRUD model tabel tracking_logs
│   │   └── TransactionLog.js           # CRUD model tabel transaction_logs
│   │
│   ├── middleware/
│   │   ├── authMiddleware.js           # JWT validation & user extraction
│   │   └── rateLimitMiddleware.js      # Cooldown (10–30s) + daily limit (10/hari)
│   │
│   ├── routes/
│   │   └── logistikitaRoutes.js        # Definisi semua route & middleware chain
│   │
│   ├── config/
│   │   └── database.js                 # MySQL connection pool
│   │
│   ├── utils/
│   │   ├── responseHelper.js           # Standard response formatter
│   │   └── logger.js                   # Winston/console logger
│   │
│   └── app.js                          # Express entry point & middleware setup
│
├── mock-server/
│   ├── smartbank.mock.js               # Mock SmartBank (development)
│   └── gateway.mock.js                 # Mock API Gateway (development)
│
├── .env                                # Environment variables (jangan di-commit)
├── .env.example                        # Template env untuk developer
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
JWT_EXPIRES_IN=1h

# ─── External Services ────────────────────────────────────────
SMARTBANK_BASE_URL=http://localhost:4000
GATEWAY_BASE_URL=http://localhost:5000
GATEWAY_API_KEY=gateway_service_key

# ─── Aturan Keuangan (sesuai ekosistem) ───────────────────────
ONGKIR_PERCENTAGE=0.05          # 5% dari nilai transaksi
ONGKIR_MINIMUM=5000             # Minimum Rp5.000
FEE_LAYANAN_PERCENTAGE=0.05     # 5% dari ongkir
FEE_GATEWAY_PERCENTAGE=0.005    # 0.5% (dipotong Gateway)
FEE_BANK_PERCENTAGE=0.01        # 1% (dipotong SmartBank)
TAX_PERCENTAGE=0.02             # 2% pajak sistem (money sink)

# ─── Rate Limiting ────────────────────────────────────────────
COOLDOWN_SECONDS_MIN=10         # Jeda minimum antar transaksi
COOLDOWN_SECONDS_MAX=30         # Jeda maksimum
MAX_DAILY_TRANSACTIONS=10       # Maks transaksi per user per hari
```

---

## 5. Authentication & Middleware

### 5.1 JWT Middleware (`authMiddleware.js`)

Setiap request ke endpoint LogistiKita **wajib** membawa JWT token yang valid di header `Authorization`.

**Header yang diperlukan:**
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Payload JWT yang diharapkan:**
```json
{
  "user_id": "USR-001",
  "email": "user@example.com",
  "iat": 1717200000,
  "exp": 1717203600
}
```

**Pseudocode `authMiddleware.js`:**
```javascript
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, error: { code: 'MISSING_TOKEN' } });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;   // { user_id, email }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN' } });
  }
};
```

### 5.2 Rate Limit Middleware (`rateLimitMiddleware.js`)

Diterapkan pada endpoint `POST /request_pengiriman`.

| Rule | Value | Error Code |
|---|---|---|
| Cooldown antar transaksi | 10–30 detik | `COOLDOWN_ACTIVE` |
| Maksimum transaksi/hari | 10 per user | `DAILY_LIMIT_EXCEEDED` |

**Pseudocode:**
```javascript
const rateLimitMiddleware = async (req, res, next) => {
  const { user_id } = req.user;

  // Cek daily limit
  const countToday = await Shipment.countTodayByUser(user_id);
  if (countToday >= MAX_DAILY_TRANSACTIONS) {
    return res.status(429).json({ success: false, error: { code: 'DAILY_LIMIT_EXCEEDED' } });
  }

  // Cek cooldown
  const lastTx = await Shipment.getLastTransactionTime(user_id);
  const diffSeconds = (Date.now() - new Date(lastTx).getTime()) / 1000;
  if (diffSeconds < COOLDOWN_SECONDS_MIN) {
    return res.status(429).json({
      success: false,
      error: { code: 'COOLDOWN_ACTIVE', retry_after: Math.ceil(COOLDOWN_SECONDS_MIN - diffSeconds) }
    });
  }

  next();
};
```

---

## 6. API Contract Lengkap

> **Base URL (development):** `http://localhost:3001`
> **Prefix:** `/logistikita`
> **Header wajib di semua request:**
> ```
> Authorization: Bearer <JWT_TOKEN>
> Content-Type: application/json
> ```

---

### 6.1 `POST /logistikita/request_pengiriman`

**Deskripsi:** Endpoint utama. Menerima permintaan pengiriman dari Marketplace/SupplierHub. Secara otomatis mengeksekusi kalkulasi biaya, kalkulasi fee, dan pembayaran ke SmartBank dalam satu alur atomik.

**Trigger:** Dipanggil otomatis oleh sistem eksternal (Marketplace/SupplierHub), **bukan** oleh user langsung.

**Middleware:** `authMiddleware` → `rateLimitMiddleware`

#### Request

```http
POST /logistikita/request_pengiriman
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

```json
{
  "order_id": "ORD-20240601-0001",
  "user_id": "USR-001",
  "alamat_tujuan": "Jl. Merdeka No. 10, Bandung, Jawa Barat",
  "jarak": 12.5,
  "nilai_transaksi": 150000,
  "source_app": "marketplace"
}
```

**Field Specification:**

| Field | Tipe | Wajib | Validasi | Keterangan |
|---|---|---|---|---|
| `order_id` | `string` | ✅ | Tidak boleh duplikat, max 100 char | ID order dari aplikasi pemicu |
| `user_id` | `string` | ✅ | Harus ada di tabel users | ID pembeli / pemilik order |
| `alamat_tujuan` | `string` | ✅ | Tidak boleh kosong | Alamat tujuan pengiriman |
| `jarak` | `float` | ✅ | > 0 | Jarak dalam km (dikirim aplikasi pemicu) |
| `nilai_transaksi` | `integer` | ✅ | > 0 | Nilai transaksi produk (basis ongkir) |
| `source_app` | `enum` | ✅ | `"marketplace"` atau `"supplierhub"` | Aplikasi asal trigger |

#### Response — Sukses (201 Created)

```json
{
  "success": true,
  "data": {
    "shipment_id": "SHIP-20240601-0001",
    "order_id": "ORD-20240601-0001",
    "status": "PROCESSING",
    "ongkir": 7500,
    "fee_layanan": 375,
    "total_biaya": 7875,
    "transaction_id": "TRX-SBANK-9981",
    "message": "Pengiriman berhasil diproses dan pembayaran telah dilakukan."
  }
}
```

#### Response — Gagal: Duplikat Order (400)

```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_ORDER",
    "message": "order_id ORD-20240601-0001 sudah terdaftar."
  }
}
```

#### Response — Gagal: Input Tidak Valid (400)

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Field 'nilai_transaksi' harus berupa integer positif.",
    "fields": ["nilai_transaksi"]
  }
}
```

#### Response — Gagal: Pembayaran Ditolak SmartBank (402)

```json
{
  "success": false,
  "error": {
    "code": "PAYMENT_FAILED",
    "message": "Pembayaran ongkir gagal. Saldo user tidak mencukupi.",
    "smartbank_error": "INSUFFICIENT_BALANCE",
    "shipment_id": "SHIP-20240601-0001",
    "shipment_status": "FAILED"
  }
}
```

#### Response — Gagal: Rate Limit (429)

```json
{
  "success": false,
  "error": {
    "code": "DAILY_LIMIT_EXCEEDED",
    "message": "User USR-001 telah mencapai batas maksimum 10 transaksi hari ini."
  }
}
```

---

### 6.2 `POST /logistikita/biaya_pengiriman`

**Deskripsi:** Menghitung estimasi biaya pengiriman berdasarkan nilai transaksi. Digunakan secara internal dalam alur `request_pengiriman`. Dapat dipanggil langsung oleh frontend untuk menampilkan estimasi sebelum checkout (informational only — tidak memproses pembayaran).

**Middleware:** `authMiddleware`

#### Request

```http
POST /logistikita/biaya_pengiriman
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

```json
{
  "nilai_transaksi": 150000,
  "jarak": 12.5
}
```

**Field Specification:**

| Field | Tipe | Wajib | Validasi |
|---|---|---|---|
| `nilai_transaksi` | `integer` | ✅ | > 0 |
| `jarak` | `float` | ✅ | > 0 |

#### Response — Sukses (200 OK)

```json
{
  "success": true,
  "data": {
    "nilai_transaksi": 150000,
    "jarak_km": 12.5,
    "ongkir_raw": 7500,
    "ongkir_final": 7500,
    "fee_layanan_estimasi": 375,
    "total_estimasi": 7875,
    "catatan": "5% dari nilai transaksi (Rp150.000 × 5% = Rp7.500). Melebihi minimum Rp5.000, maka digunakan nilai 5%."
  }
}
```

> **Catatan Penting:** `ongkir_final = MAX(nilai_transaksi × 5%, 5000)`. Jika `nilai_transaksi` sangat kecil sehingga 5%-nya di bawah Rp5.000, maka ongkir dibulatkan ke Rp5.000.

---

### 6.3 `POST /logistikita/pembayaran_logistik`

**Deskripsi:** Mengirimkan payment request ke SmartBank melalui API Gateway. Dipanggil secara otomatis oleh `shipmentService` setelah kalkulasi biaya selesai. Endpoint ini juga tersedia sebagai endpoint publik internal untuk keperluan testing/debug.

**Middleware:** `authMiddleware`

#### Request (Internal Call)

```http
POST /logistikita/pembayaran_logistik
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

```json
{
  "shipment_id": "SHIP-20240601-0001",
  "order_id": "ORD-20240601-0001",
  "user_id": "USR-001",
  "ongkir": 7500,
  "fee_layanan": 375,
  "total_biaya": 7875
}
```

**Field Specification:**

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `shipment_id` | `string` | ✅ | UUID shipment yang sudah dibuat |
| `order_id` | `string` | ✅ | Referensi ke order asal |
| `user_id` | `string` | ✅ | ID payer (pembeli) |
| `ongkir` | `integer` | ✅ | Hasil kalkulasi ongkir |
| `fee_layanan` | `integer` | ✅ | Hasil kalkulasi fee layanan |
| `total_biaya` | `integer` | ✅ | `ongkir + fee_layanan` |

#### Response — Sukses (200 OK)

```json
{
  "success": true,
  "data": {
    "payment_status": "SUCCESS",
    "transaction_id": "TRX-SBANK-9981",
    "shipment_status": "PROCESSING",
    "deducted_amounts": {
      "pokok": 7875,
      "fee_bank": 79,
      "pajak_sistem": 157,
      "fee_gateway": 39,
      "total_debit_user": 8150
    },
    "message": "Pembayaran ongkir berhasil diproses oleh SmartBank."
  }
}
```

#### Response — Gagal Pembayaran (402)

```json
{
  "success": false,
  "error": {
    "code": "PAYMENT_FAILED",
    "message": "SmartBank menolak pembayaran.",
    "smartbank_error": "INSUFFICIENT_BALANCE"
  }
}
```

---

### 6.4 `GET /logistikita/tracking_status`

**Deskripsi:** Mengambil status terkini dan riwayat status pengiriman. **Satu-satunya endpoint yang secara aktif diakses user** melalui halaman tracking di frontend.

**Trigger:** Pull-based — user membuka halaman tracking atau klik refresh.

**Middleware:** `authMiddleware`

#### Request

```http
GET /logistikita/tracking_status?order_id=ORD-20240601-0001
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `order_id` | `string` | ✅ | ID order yang ingin dicek |

> **Validasi Kepemilikan:** Backend akan memverifikasi bahwa `user_id` dari JWT token sama dengan `user_id` pemilik shipment tersebut. Jika berbeda, response 403 Forbidden.

#### Response — Sukses (200 OK)

```json
{
  "success": true,
  "data": {
    "shipment_id": "SHIP-20240601-0001",
    "order_id": "ORD-20240601-0001",
    "status_terkini": "SHIPPED",
    "alamat_tujuan": "Jl. Merdeka No. 10, Bandung, Jawa Barat",
    "ongkir": 7500,
    "fee_layanan": 375,
    "total_biaya": 7875,
    "estimasi_tiba": "2024-06-02",
    "riwayat_status": [
      {
        "status": "PENDING",
        "timestamp": "2024-06-01T09:00:00Z",
        "keterangan": "Permintaan pengiriman diterima"
      },
      {
        "status": "PROCESSING",
        "timestamp": "2024-06-01T09:01:05Z",
        "keterangan": "Pembayaran ongkir berhasil, menunggu kurir"
      },
      {
        "status": "SHIPPED",
        "timestamp": "2024-06-01T11:30:00Z",
        "keterangan": "Barang telah diambil kurir"
      }
    ]
  }
}
```

#### Response — Tidak Ditemukan (404)

```json
{
  "success": false,
  "error": {
    "code": "SHIPMENT_NOT_FOUND",
    "message": "Tidak ditemukan pengiriman untuk order_id ORD-20240601-0001."
  }
}
```

#### Response — Akses Ditolak (403)

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Anda tidak berhak mengakses data pengiriman ini."
  }
}
```

---

### 6.5 `POST /logistikita/biaya_layanan_logistik`

**Deskripsi:** Menghitung fee layanan LogistiKita dari nilai ongkir. Dipanggil secara otomatis oleh `shipmentService`. Tersedia sebagai endpoint untuk keperluan simulasi/debug.

**Middleware:** `authMiddleware`

#### Request (Internal Call)

```http
POST /logistikita/biaya_layanan_logistik
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

```json
{
  "order_id": "ORD-20240601-0001",
  "ongkir": 7500
}
```

#### Response — Sukses (200 OK)

```json
{
  "success": true,
  "data": {
    "fee_layanan": 375,
    "basis_ongkir": 7500,
    "persentase": "5%",
    "catatan": "Fee layanan LogistiKita sebesar 5% dari ongkir (Rp7.500 × 5% = Rp375)"
  }
}
```

---

### 6.6 Referensi HTTP Status Code

| HTTP Code | Kode Error | Kondisi |
|---|---|---|
| `200 OK` | — | Request berhasil (GET/POST informational) |
| `201 Created` | — | Shipment berhasil dibuat |
| `400 Bad Request` | `VALIDATION_ERROR` | Input tidak valid |
| `400 Bad Request` | `DUPLICATE_ORDER` | `order_id` sudah terdaftar |
| `400 Bad Request` | `USER_NOT_FOUND` | `user_id` tidak dikenal SmartBank |
| `401 Unauthorized` | `MISSING_TOKEN` | Header Authorization tidak ada |
| `401 Unauthorized` | `INVALID_TOKEN` | JWT expired atau tidak valid |
| `402 Payment Required` | `PAYMENT_FAILED` | SmartBank menolak pembayaran |
| `402 Payment Required` | `INSUFFICIENT_BALANCE` | Saldo user tidak cukup |
| `403 Forbidden` | `FORBIDDEN` | User tidak berhak akses resource ini |
| `404 Not Found` | `SHIPMENT_NOT_FOUND` | Data pengiriman tidak ditemukan |
| `429 Too Many Requests` | `DAILY_LIMIT_EXCEEDED` | Melebihi 10 transaksi/hari |
| `429 Too Many Requests` | `COOLDOWN_ACTIVE` | Transaksi terlalu cepat |
| `500 Internal Server Error` | `INTERNAL_ERROR` | Error tidak terduga di server |
| `503 Service Unavailable` | `SMARTBANK_DOWN` | SmartBank tidak dapat dihubungi |

---

## 7. Business Logic & Rules

### 7.1 Kalkulasi Ongkir

**Formula:**
```
ongkir = MAX(nilai_transaksi × 5%, 5000)
```

**Implementasi JavaScript:**
```javascript
function hitungOngkir(nilaiTransaksi) {
  const ONGKIR_PERCENTAGE = parseFloat(process.env.ONGKIR_PERCENTAGE) || 0.05;
  const ONGKIR_MINIMUM    = parseInt(process.env.ONGKIR_MINIMUM) || 5000;
  const ongkirRaw = Math.floor(nilaiTransaksi * ONGKIR_PERCENTAGE);
  return Math.max(ongkirRaw, ONGKIR_MINIMUM);
}
```

**Tabel Contoh:**

| Nilai Transaksi | 5% dari Transaksi | Ongkir Final | Aturan |
|---|---|---|---|
| Rp10.000 | Rp500 | **Rp5.000** | 5% < Rp5.000 → flat minimum |
| Rp80.000 | Rp4.000 | **Rp5.000** | 5% < Rp5.000 → flat minimum |
| Rp100.000 | Rp5.000 | **Rp5.000** | 5% = Rp5.000 → sama persis |
| Rp150.000 | Rp7.500 | **Rp7.500** | 5% > Rp5.000 → pakai 5% |
| Rp500.000 | Rp25.000 | **Rp25.000** | 5% > Rp5.000 → pakai 5% |

### 7.2 Kalkulasi Fee Layanan

**Formula:**
```
fee_layanan = FLOOR(ongkir × 5%)
```

**Implementasi JavaScript:**
```javascript
function hitungFeeLayanan(ongkir) {
  const FEE_PERCENTAGE = parseFloat(process.env.FEE_LAYANAN_PERCENTAGE) || 0.05;
  return Math.floor(ongkir * FEE_PERCENTAGE);
}
```

### 7.3 Kalkulasi Total Biaya

```
total_biaya = ongkir + fee_layanan
```

**Contoh pada transaksi Rp150.000:**
```
nilai_transaksi : Rp150.000
ongkir          : MAX(150.000 × 5%, 5.000) = MAX(7.500, 5.000) = Rp7.500
fee_layanan     : 7.500 × 5% = Rp375
total_biaya     : Rp7.500 + Rp375 = Rp7.875
```

### 7.4 Peran `jarak` dalam Sistem

`jarak` (dalam km) **tidak** digunakan dalam formula kalkulasi ongkir saat ini. Perannya:

1. **Data informatif** — dicatat di `shipments` untuk dokumentasi & audit
2. **Validasi sanity** — harus > 0 agar pengiriman valid
3. **Masa depan** — dapat digunakan untuk tarif bertingkat per km di iterasi berikutnya

---

## 8. Integrasi SmartBank via API Gateway

### 8.1 Alur Pembayaran

```
LogistiKita Backend
       │
       │ POST /logistics/pay
       ▼
  API Gateway
  ├── Validasi JWT
  ├── Logging request
  └── Potong Fee Gateway (0.5% dari total_biaya)
       │
       │ Forward ke SmartBank
       ▼
  SmartBank
  ├── Validasi saldo user >= total_debit
  ├── Debit saldo user
  │     - Pokok           : total_biaya
  │     - Fee Bank (1%)   : FLOOR(total_biaya × 1%)
  │     - Pajak Sistem (2%): FLOOR(total_biaya × 2%)
  ├── Kredit akun LogistiKita : total_biaya
  ├── Fee Bank → Reserve SmartBank
  └── Pajak Sistem → Money Sink (dihapus dari sirkulasi)
       │
       ▼
  Response → Gateway → LogistiKita
```

### 8.2 Payload ke SmartBank

```json
POST /payment  (SmartBank endpoint, via Gateway)
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

### 8.3 Response dari SmartBank

**Sukses:**
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

**Gagal:**
```json
{
  "status": "FAILED",
  "error_code": "INSUFFICIENT_BALANCE",
  "message": "User balance is below required amount.",
  "required": 8150,
  "available": 3000
}
```

### 8.4 Error Handling SmartBank

| Error Code | Kondisi | Tindakan LogistiKita |
|---|---|---|
| `INSUFFICIENT_BALANCE` | Saldo user kurang | Shipment → FAILED, return 402 ke pemicu |
| `USER_NOT_FOUND` | user_id tidak dikenal | Shipment → FAILED, return 400 ke pemicu |
| `DAILY_LIMIT_EXCEEDED` | Melebihi 10 tx/hari | Shipment → FAILED, return 429 ke pemicu |
| `COOLDOWN_ACTIVE` | Transaksi terlalu cepat | Retry setelah cooldown, atau return 429 |
| `SYSTEM_ERROR` | SmartBank down | Shipment tetap PENDING, log error, return 503 |

### 8.5 Implementasi `smartbankService.js`

```javascript
const axios = require('axios');

async function processPayment({ shipmentId, orderId, userId, ongkir, feeLay, totalBiaya }) {
  const payload = {
    from_app: 'logistikita',
    from_user: userId,
    to_service: 'logistikita',
    amount: totalBiaya,
    metadata: {
      order_id: orderId,
      shipment_id: shipmentId,
      type: 'ongkir',
      breakdown: { ongkir, fee_layanan_logistik: feeLay }
    }
  };

  const response = await axios.post(
    `${process.env.GATEWAY_BASE_URL}/logistics/pay`,
    payload,
    {
      headers: {
        'Authorization': `Bearer ${process.env.GATEWAY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    }
  );

  return response.data;
}

module.exports = { processPayment };
```

---

## 9. Database Schema & SQL Query

### 9.1 ERD

```
users (1) ─────────────────── (*) shipments
                                       │
                                       │ (1)
                                       │
                                  (*) tracking_logs

shipments (1) ──────────────── (*) transaction_logs
```

### 9.2 SQL DDL — Buat Database & Tabel

```sql
-- ============================================================
-- DATABASE LOGISTIKITA
-- ============================================================
CREATE DATABASE IF NOT EXISTS logistikita_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE logistikita_db;

-- ============================================================
-- TABEL: users
-- Menyimpan referensi user dari ekosistem SmartBank.
-- User diregistrasi di SmartBank; LogistiKita hanya menyimpan
-- user_id sebagai foreign key untuk validasi lokal.
-- ============================================================
CREATE TABLE users (
  id          VARCHAR(36)   NOT NULL PRIMARY KEY,
  name        VARCHAR(100)  NOT NULL,
  email       VARCHAR(150)  NOT NULL UNIQUE,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
                            ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABEL: shipments
-- Satu record per pengiriman. order_id bersifat UNIQUE
-- untuk mencegah duplikat permintaan pengiriman.
-- ============================================================
CREATE TABLE shipments (
  id                VARCHAR(36)     NOT NULL PRIMARY KEY,
  order_id          VARCHAR(100)    NOT NULL UNIQUE,
  user_id           VARCHAR(36)     NOT NULL,
  source_app        ENUM('marketplace', 'supplierhub') NOT NULL,
  alamat_tujuan     TEXT            NOT NULL,
  jarak_km          DECIMAL(10,2)   NOT NULL,
  nilai_transaksi   BIGINT          NOT NULL,
  ongkir            BIGINT          NOT NULL DEFAULT 0,
  fee_layanan       BIGINT          NOT NULL DEFAULT 0,
  total_biaya       BIGINT          NOT NULL DEFAULT 0,
  status            ENUM(
                      'PENDING',
                      'PROCESSING',
                      'SHIPPED',
                      'DELIVERED',
                      'FAILED'
                    ) NOT NULL DEFAULT 'PENDING',
  transaction_id    VARCHAR(100)    NULL,
  created_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_shipments_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

  INDEX idx_shipments_user_id  (user_id),
  INDEX idx_shipments_status   (status),
  INDEX idx_shipments_created  (created_at)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABEL: tracking_logs
-- Riwayat perubahan status pengiriman (append-only).
-- Setiap perubahan status dicatat sebagai baris baru.
-- ============================================================
CREATE TABLE tracking_logs (
  id            BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT PRIMARY KEY,
  shipment_id   VARCHAR(36)       NOT NULL,
  status        ENUM(
                  'PENDING',
                  'PROCESSING',
                  'SHIPPED',
                  'DELIVERED',
                  'FAILED'
                ) NOT NULL,
  keterangan    VARCHAR(255)      NULL,
  created_at    DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_tracking_shipment
    FOREIGN KEY (shipment_id)
    REFERENCES shipments(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  INDEX idx_tracking_shipment (shipment_id),
  INDEX idx_tracking_created  (created_at)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABEL: transaction_logs
-- Audit trail semua percobaan pembayaran ke SmartBank.
-- Mencatat sukses maupun gagal.
-- ============================================================
CREATE TABLE transaction_logs (
  id                  BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT PRIMARY KEY,
  shipment_id         VARCHAR(36)       NOT NULL,
  order_id            VARCHAR(100)      NOT NULL,
  user_id             VARCHAR(36)       NOT NULL,
  amount              BIGINT            NOT NULL,
  ongkir              BIGINT            NOT NULL,
  fee_layanan         BIGINT            NOT NULL,
  payment_status      ENUM('SUCCESS', 'FAILED', 'PENDING') NOT NULL DEFAULT 'PENDING',
  transaction_id      VARCHAR(100)      NULL,
  error_code          VARCHAR(100)      NULL,
  error_message       TEXT              NULL,
  smartbank_payload   JSON              NULL,
  smartbank_response  JSON              NULL,
  created_at          DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_txlog_shipment
    FOREIGN KEY (shipment_id)
    REFERENCES shipments(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  INDEX idx_txlog_shipment  (shipment_id),
  INDEX idx_txlog_user      (user_id),
  INDEX idx_txlog_status    (payment_status),
  INDEX idx_txlog_created   (created_at)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;
```

---

### 9.3 SQL DML — Query Operasional

#### Query 1 — INSERT: Buat shipment baru (status PENDING)

```sql
-- Dieksekusi saat POST /request_pengiriman diterima
INSERT INTO shipments (
  id,
  order_id,
  user_id,
  source_app,
  alamat_tujuan,
  jarak_km,
  nilai_transaksi,
  status
) VALUES (
  UUID(),                                         -- Auto-generate UUID
  'ORD-20240601-0001',
  'USR-001',
  'marketplace',
  'Jl. Merdeka No. 10, Bandung, Jawa Barat',
  12.50,
  150000,
  'PENDING'
);
```

#### Query 2 — UPDATE: Simpan hasil kalkulasi biaya

```sql
-- Dieksekusi setelah hitungOngkir() dan hitungFeeLayanan() selesai
UPDATE shipments
SET
  ongkir        = 7500,
  fee_layanan   = 375,
  total_biaya   = 7875,
  updated_at    = CURRENT_TIMESTAMP
WHERE order_id = 'ORD-20240601-0001';
```

#### Query 3 — UPDATE: Update status setelah pembayaran SmartBank SUKSES

```sql
-- Dieksekusi setelah SmartBank merespons SUCCESS
UPDATE shipments
SET
  status         = 'PROCESSING',
  transaction_id = 'TRX-SBANK-9981',
  updated_at     = CURRENT_TIMESTAMP
WHERE order_id = 'ORD-20240601-0001';
```

#### Query 4 — UPDATE: Update status setelah pembayaran SmartBank GAGAL

```sql
-- Dieksekusi setelah SmartBank merespons FAILED
UPDATE shipments
SET
  status     = 'FAILED',
  updated_at = CURRENT_TIMESTAMP
WHERE order_id = 'ORD-20240601-0001';
```

#### Query 5 — INSERT: Catat perubahan status ke tracking_logs

```sql
-- Dipanggil setiap kali status shipment berubah
-- Menggunakan subquery untuk mendapatkan shipment_id dari order_id
INSERT INTO tracking_logs (shipment_id, status, keterangan)
SELECT
  id,
  'PROCESSING',
  'Pembayaran ongkir berhasil, menunggu kurir'
FROM shipments
WHERE order_id = 'ORD-20240601-0001';
```

#### Query 6 — INSERT: Log transaksi pembayaran (sukses)

```sql
-- Dieksekusi setelah konfirmasi SmartBank, catat detail transaksi
INSERT INTO transaction_logs (
  shipment_id,
  order_id,
  user_id,
  amount,
  ongkir,
  fee_layanan,
  payment_status,
  transaction_id,
  smartbank_payload,
  smartbank_response
)
SELECT
  s.id                                          AS shipment_id,
  s.order_id,
  s.user_id,
  s.total_biaya                                 AS amount,
  s.ongkir,
  s.fee_layanan,
  'SUCCESS'                                     AS payment_status,
  'TRX-SBANK-9981'                              AS transaction_id,
  JSON_OBJECT(
    'from_user', s.user_id,
    'to_service', 'logistikita',
    'amount', s.total_biaya
  )                                             AS smartbank_payload,
  JSON_OBJECT(
    'status', 'SUCCESS',
    'transaction_id', 'TRX-SBANK-9981'
  )                                             AS smartbank_response
FROM shipments s
WHERE s.order_id = 'ORD-20240601-0001';
```

#### Query 7 — INSERT: Log transaksi pembayaran (gagal)

```sql
-- Dieksekusi saat SmartBank menolak, catat error untuk audit trail
INSERT INTO transaction_logs (
  shipment_id,
  order_id,
  user_id,
  amount,
  ongkir,
  fee_layanan,
  payment_status,
  error_code,
  error_message,
  smartbank_response
)
SELECT
  s.id,
  s.order_id,
  s.user_id,
  s.total_biaya,
  s.ongkir,
  s.fee_layanan,
  'FAILED'                                      AS payment_status,
  'INSUFFICIENT_BALANCE'                        AS error_code,
  'Saldo user tidak mencukupi untuk pembayaran ongkir' AS error_message,
  JSON_OBJECT(
    'status', 'FAILED',
    'error_code', 'INSUFFICIENT_BALANCE'
  )                                             AS smartbank_response
FROM shipments s
WHERE s.order_id = 'ORD-20240601-0001';
```

#### Query 8 — SELECT: Ambil data tracking untuk user (dengan validasi kepemilikan)

```sql
-- Dieksekusi saat GET /tracking_status?order_id=...
-- user_id diambil dari JWT token untuk validasi kepemilikan
SELECT
  s.id              AS shipment_id,
  s.order_id,
  s.status          AS status_terkini,
  s.alamat_tujuan,
  s.jarak_km,
  s.ongkir,
  s.fee_layanan,
  s.total_biaya,
  s.transaction_id,
  s.source_app,
  s.created_at
FROM shipments s
WHERE s.order_id = 'ORD-20240601-0001'
  AND s.user_id  = 'USR-001';   -- Validasi kepemilikan dari JWT
```

#### Query 9 — SELECT: Ambil riwayat status pengiriman

```sql
-- JOIN tracking_logs untuk mendapatkan histori status
SELECT
  tl.status,
  tl.keterangan,
  tl.created_at AS timestamp
FROM tracking_logs tl
INNER JOIN shipments s
  ON tl.shipment_id = s.id
WHERE s.order_id = 'ORD-20240601-0001'
ORDER BY tl.created_at ASC;
```

#### Query 10 — SELECT: Cek duplikasi order_id

```sql
-- Dieksekusi di awal POST /request_pengiriman sebelum INSERT
SELECT COUNT(*) AS total
FROM shipments
WHERE order_id = 'ORD-20240601-0001';
-- Jika total > 0 → tolak dengan error DUPLICATE_ORDER
```

#### Query 11 — SELECT: Cek jumlah transaksi user hari ini (Daily Limit)

```sql
-- Untuk validasi MAX 10 transaksi/user/hari
SELECT COUNT(*) AS total_hari_ini
FROM shipments
WHERE user_id    = 'USR-001'
  AND DATE(created_at) = CURDATE()
  AND status IN ('PROCESSING', 'SHIPPED', 'DELIVERED');
-- Jika total_hari_ini >= 10 → tolak dengan error DAILY_LIMIT_EXCEEDED
```

#### Query 12 — SELECT: Cek waktu transaksi terakhir (Cooldown)

```sql
-- Untuk validasi cooldown 10–30 detik antar transaksi
SELECT MAX(created_at) AS last_transaction
FROM shipments
WHERE user_id = 'USR-001';
-- Di aplikasi: hitung selisih detik antara CURRENT_TIMESTAMP dan last_transaction
-- Jika selisih < 10 detik → tolak dengan error COOLDOWN_ACTIVE
```

#### Query 13 — SELECT: Admin — Semua shipment dengan status tertentu

```sql
-- Digunakan untuk admin dashboard atau debugging
SELECT
  s.id             AS shipment_id,
  s.order_id,
  s.user_id,
  u.name           AS user_name,
  s.status,
  s.total_biaya,
  s.source_app,
  s.created_at
FROM shipments s
LEFT JOIN users u ON s.user_id = u.id
WHERE s.status = 'FAILED'                 -- Ganti status sesuai kebutuhan
ORDER BY s.created_at DESC
LIMIT 50;
```

#### Query 14 — SELECT: Laporan agregat transaksi per hari

```sql
-- Digunakan untuk monitoring dan laporan keuangan
SELECT
  DATE(created_at)          AS tanggal,
  COUNT(*)                  AS total_pengiriman,
  SUM(CASE WHEN status IN ('PROCESSING','SHIPPED','DELIVERED') THEN 1 ELSE 0 END)
                            AS berhasil,
  SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END)
                            AS gagal,
  SUM(total_biaya)          AS total_revenue,
  SUM(ongkir)               AS total_ongkir,
  SUM(fee_layanan)          AS total_fee_layanan
FROM shipments
GROUP BY DATE(created_at)
ORDER BY tanggal DESC;
```

#### Query 15 — UPDATE: Manual update status ke SHIPPED (oleh kurir/admin)

```sql
-- Digunakan saat kurir mengkonfirmasi pengambilan barang
-- (Fitur ini dapat diperluas dengan endpoint admin/kurir di masa depan)
UPDATE shipments
SET
  status     = 'SHIPPED',
  updated_at = CURRENT_TIMESTAMP
WHERE id = 'SHIP-20240601-0001'
  AND status = 'PROCESSING';   -- Guard: hanya bisa SHIPPED jika sebelumnya PROCESSING

-- Kemudian insert ke tracking_logs
INSERT INTO tracking_logs (shipment_id, status, keterangan)
VALUES ('SHIP-20240601-0001', 'SHIPPED', 'Barang telah diambil kurir');
```

#### Query 16 — UPDATE: Manual update status ke DELIVERED

```sql
-- Digunakan saat pengiriman dikonfirmasi tiba
UPDATE shipments
SET
  status     = 'DELIVERED',
  updated_at = CURRENT_TIMESTAMP
WHERE id = 'SHIP-20240601-0001'
  AND status = 'SHIPPED';   -- Guard: hanya bisa DELIVERED jika sebelumnya SHIPPED

-- Kemudian insert ke tracking_logs
INSERT INTO tracking_logs (shipment_id, status, keterangan)
VALUES ('SHIP-20240601-0001', 'DELIVERED', 'Barang berhasil diterima penerima');
```

---

## 10. Error Handling & Response Standard

### 10.1 Standard Response Format

**Sukses:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Gagal:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Pesan error yang jelas dan actionable.",
    "details": { ... }   // Opsional: informasi tambahan
  }
}
```

### 10.2 `responseHelper.js`

```javascript
const success = (res, data, statusCode = 200) => {
  return res.status(statusCode).json({ success: true, data });
};

const error = (res, code, message, statusCode = 400, details = null) => {
  const payload = { success: false, error: { code, message } };
  if (details) payload.error.details = details;
  return res.status(statusCode).json(payload);
};

module.exports = { success, error };
```

### 10.3 Global Error Handler (`app.js`)

```javascript
app.use((err, req, res, next) => {
  console.error('[UNHANDLED ERROR]', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Terjadi kesalahan internal. Silakan coba lagi.'
    }
  });
});
```

---

## 11. Rate Limiting & Validasi Keuangan

### 11.1 Aturan Rate Limiting

| Aturan | Nilai | Enforcement |
|---|---|---|
| Cooldown antar transaksi | 10 detik minimum | Cek `MAX(created_at)` dari `shipments` per user |
| Maksimum transaksi harian | 10 transaksi/user/hari | COUNT dari `shipments` per user per hari |

### 11.2 Ringkasan Semua Fee

| # | Komponen Fee | Formula | Dipotong Oleh | Aliran Uang |
|---|---|---|---|---|
| 1 | Ongkir (Biaya Pengiriman) | `MAX(nilai_tx × 5%, Rp5.000)` | LogistiKita | User → LogistiKita |
| 2 | Fee Layanan Logistik | `ongkir × 5%` | LogistiKita | User → LogistiKita |
| 3 | Fee Gateway | `total_biaya × 0.5%` | API Gateway | User → Gateway |
| 4 | Fee Bank | `total_biaya × 1%` | SmartBank | User → Reserve SmartBank |
| 5 | Pajak Sistem | `total_biaya × 2%` | SmartBank | User → Money Sink |

### 11.3 Simulasi Alur Uang (Transaksi Rp150.000)

```
User membayar total = Rp8.150 (dari saldo SmartBank)

Breakdown debit user:
  Pokok (total_biaya)   : Rp7.875
  Fee Bank (1%)         : Rp  79
  Pajak Sistem (2%)     : Rp 157
  Fee Gateway (0.5%)    : Rp  39
  ─────────────────────────────
  Total Debit           : Rp8.150

Aliran uang:
  → LogistiKita account   : Rp7.875 (dikreditkan SmartBank)
  → Reserve SmartBank     : Rp   79 (Fee Bank)
  → Money Sink (dihapus)  : Rp  157 (Pajak Sistem)
  → Gateway account       : Rp   39 (Fee Gateway)
```

---

## 12. Alur Eksekusi Per Fitur (Flow Diagram)

### 12.1 Alur Utama: Request Pengiriman

```
POST /request_pengiriman
         │
         ▼
[1] authMiddleware (JWT validation)
         │ FAIL → 401 Unauthorized
         ▼
[2] rateLimitMiddleware (daily limit + cooldown)
         │ FAIL → 429 Too Many Requests
         ▼
[3] Validasi input (order_id, user_id, jarak, nilai_transaksi, source_app)
         │ FAIL → 400 Validation Error
         ▼
[4] SELECT: Cek duplikasi order_id
         │ FOUND → 400 Duplicate Order
         ▼
[5] INSERT: Buat shipment baru (status = PENDING)
         ▼
[6] hitungOngkir(nilai_transaksi)
    → ongkir = MAX(nilai_transaksi × 5%, 5000)
         ▼
[7] hitungFeeLayanan(ongkir)
    → fee_layanan = FLOOR(ongkir × 5%)
         ▼
[8] UPDATE: Simpan ongkir, fee_layanan, total_biaya ke shipments
         ▼
[9] POST /logistics/pay → API Gateway → SmartBank
         │
         ├─ SMARTBANK SUCCESS ─────────────────────────────┐
         │                                                 │
         │  UPDATE shipments: status = PROCESSING          │
         │  INSERT tracking_logs: PROCESSING               │
         │  INSERT transaction_logs: SUCCESS               │
         │  Response 201: { shipment_id, status, ...fees } │
         │                                                 │
         └─ SMARTBANK FAILED ──────────────────────────────┤
                                                           │
            UPDATE shipments: status = FAILED              │
            INSERT tracking_logs: FAILED                   │
            INSERT transaction_logs: FAILED + error_code   │
            Response 402: { error, smartbank_error }       │
```

### 12.2 Alur: Tracking Status

```
GET /tracking_status?order_id=...
         │
         ▼
[1] authMiddleware (JWT → ekstrak user_id)
         │ FAIL → 401 Unauthorized
         ▼
[2] Validasi query param: order_id tidak kosong
         │ FAIL → 400 Validation Error
         ▼
[3] SELECT shipments WHERE order_id = ? AND user_id = ?
         │ NOT FOUND → 404 Shipment Not Found
         │ user_id MISMATCH → 403 Forbidden
         ▼
[4] SELECT tracking_logs WHERE shipment_id = ? ORDER BY created_at ASC
         ▼
[5] Susun response: { shipment_id, status_terkini, riwayat_status, ... }
         ▼
[6] Response 200 OK
```

---

## 13. Acceptance Criteria

### Feature 1 — Request Pengiriman

- [ ] Menerima dan memvalidasi semua required field
- [ ] Menolak `order_id` duplikat dengan error `DUPLICATE_ORDER`
- [ ] Menjalankan kalkulasi ongkir dengan formula `MAX(nilai_tx × 5%, 5000)` secara benar
- [ ] Menjalankan kalkulasi fee layanan dengan formula `ongkir × 5%` secara benar
- [ ] Mengirimkan payment request ke SmartBank via API Gateway
- [ ] Meng-update status shipment berdasarkan response SmartBank
- [ ] Mencatat setiap percobaan di `transaction_logs` (termasuk yang gagal)
- [ ] Mencatat perubahan status di `tracking_logs`
- [ ] Mengembalikan response 201 Created jika sukses
- [ ] Mengembalikan response 402 jika SmartBank menolak

### Feature 2 — Biaya Pengiriman

- [ ] Menghitung ongkir sesuai formula dengan benar
- [ ] Menerapkan minimum Rp5.000 jika 5% < Rp5.000
- [ ] Mengembalikan breakdown kalkulasi dalam response

### Feature 3 — Pembayaran Logistik

- [ ] Mengirimkan payload lengkap ke SmartBank via Gateway
- [ ] Menangani semua error code SmartBank sesuai tabel 8.4
- [ ] Tidak pernah memproses saldo langsung

### Feature 4 — Tracking Status

- [ ] Memvalidasi kepemilikan order (user_id dari JWT = user_id di shipments)
- [ ] Mengembalikan status terkini dan riwayat lengkap
- [ ] Mengembalikan 403 jika user tidak berhak

### Feature 5 — Biaya Layanan Logistik

- [ ] Menghitung fee 5% dari ongkir dengan benar
- [ ] Selalu disertakan dalam setiap transaksi pengiriman (tidak bisa opt-out)

### Non-Functional

- [ ] Semua endpoint memvalidasi JWT (kecuali endpoint health check)
- [ ] Rate limiting berjalan: max 10 tx/hari per user, cooldown 10 detik
- [ ] Semua transaksi tercatat di `transaction_logs` (audit trail lengkap)
- [ ] Response time < 3 detik (tidak termasuk waktu tunggu SmartBank)
- [ ] Tidak ada saldo yang dimanipulasi langsung di database LogistiKita

---

*PRD Backend ini mengacu pada [README.md](./README.md) sebagai dokumen acuan utama. Semua implementasi harus konsisten dengan spesifikasi di dokumen tersebut.*
