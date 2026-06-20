# PRD Frontend — LogistiKita

> **Dokumen:** Product Requirements Document (Frontend)
> **Proyek:** LogistiKita — Aplikasi Manajemen Pengiriman Barang
> **Mata Kuliah:** Rekayasa Perangkat Lunak 2
> **Stack Frontend:** Next.js 15+ | React 19 | Tailwind CSS v4
> **Versi:** 2.0.0 | Tanggal: 2026-06-17

---

## Daftar Isi

1. [Overview & Tujuan](#1-overview--tujuan)
2. [Arsitektur Frontend](#2-arsitektur-frontend)
3. [Struktur Direktori Frontend](#3-struktur-direktori-frontend)
4. [Design System & Token](#4-design-system--token)
5. [Halaman & Route](#5-halaman--route)
6. [Komponen Reusable](#6-komponen-reusable)
7. [Integrasi API & Data Fetching](#7-integrasi-api--data-fetching)
8. [State Management](#8-state-management)
9. [Alur Pengguna Per Fitur](#9-alur-pengguna-per-fitur)
10. [Acceptance Criteria](#10-acceptance-criteria)

---

## 1. Overview & Tujuan

Frontend **LogistiKita** adalah antarmuka web untuk semua pengguna dalam ekosistem logistik. Terdapat empat kategori peran pengguna:

| Peran | Target Pengguna | Fungsi Utama |
|---|---|---|
| **Marketing / Landing** | Pengguna umum | Memperkenalkan layanan LogistiKita |
| **Customer** | Customer yang sudah login | Membuat pengiriman, melihat pengiriman saya, lacak paket |
| **Kurir** | Kurir yang sudah login | Dashboard tugas: pickup, transit cabang, delivery |
| **Admin** | Admin yang sudah login | Dashboard admin: overview, keuangan (chart), pengiriman, user, cabang, kurir |
| **Tracking** | Siapa saja (tanpa login) | Melacak status pengiriman via Order ID |
| **Simulator** | Developer / tester | Menguji alur end-to-end secara visual |

### Prinsip Desain

- **Uber-Inspired Design Language** — Palet hitam-putih, tipografi geometric sans, bentuk pill (radius 999 px).
- **Server-side Rendering (SSR)** untuk halaman marketing; `'use client'` untuk halaman interaktif.
- **Polling** untuk tracking status (setiap 3 detik), bukan WebSocket.
- **JWT-based Auth** — Login session management nyata dengan token di localStorage/cookie.
- **Responsive Design** — Semua halaman responsif. Dashboard kurir tampil baik di desktop maupun layar kecil.

### Batasan Scope Frontend

| Aspek | Ketentuan |
|---|---|
| **Autentikasi** | Login/register untuk customer. Kurir & admin dibuat oleh admin. |
| **Pembayaran** | Tidak menampilkan halaman pembayaran; proses terjadi otomatis di backend |
| **Real-time** | Polling interval, bukan WebSocket |
| **Tracking** | Bisa diakses **tanpa login** (input Order ID manual) |
| **Mobile** | Responsive web, bukan native app |

---

## 2. Arsitektur Frontend

```
┌─────────────────────────────────────────────────────────────────┐
│                      BROWSER (User)                             │
│                                                                 │
│  /                    → Landing Page (SSR)                      │
│  /login               → Login (Client)                          │
│  /register            → Register (Client)                       │
│  /tracking            → Tracking tanpa login (Client)           │
│  /buat-pengiriman     → Buat Pengiriman [customer] (Client)     │
│  /pengiriman-saya     → List Pengiriman [customer] (Client)     │
│  /dashboard/kurir     → Dashboard Kurir [kurir] (Client)        │
│  /admin               → Admin Overview [admin] (Client)         │
│  /admin/keuangan      → Admin Keuangan [admin] (Client)         │
│  /admin/pengiriman    → Admin Pengiriman [admin] (Client)       │
│  /admin/users         → Admin Users [admin] (Client)            │
│  /admin/cabang        → Admin Cabang [admin] (Client)           │
│  /admin/kurir         → Admin Kurir [admin] (Client)            │
│  /simulator           → Simulator [dev] (Client)                │
└──────────────────────┬──────────────────────────────────────────┘
                       │ HTTP / fetch()
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                  LOGISTIKITA BACKEND (3001)                      │
│  POST /api/auth/register, /api/auth/login, GET /api/auth/me             │
│  POST /api/pengiriman                                   │
│  GET  /api/pengiriman-saya                              │
│  GET  /api/tracking/:order_id                           │
│  POST /api/estimasi-ongkir                              │
│  GET  /api/kurir/tugas, /kurir/riwayat                  │
│  PUT  /api/kurir/pickup, /tiba-cabang, /delivered, ...  │
│  GET  /api/admin/overview, /keuangan, /shipments, ...   │
│  GET  /api/cabang/list                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Struktur Direktori Frontend

```
frontend/
├── app/
│   ├── layout.js                       # Root layout: Navbar + Footer + font
│   ├── globals.css                     # Design token, Tailwind v4
│   ├── page.js                         # Landing page (SSR)
│   ├── login/
│   │   └── page.js                     # Login page
│   ├── register/
│   │   └── page.js                     # Register page (customer)
│   ├── tracking/
│   │   └── page.js                     # Tracking tanpa login
│   ├── buat-pengiriman/
│   │   └── page.js                     # Buat pengiriman (customer)
│   ├── pengiriman-saya/
│   │   └── page.js                     # List pengiriman saya (customer)
│   ├── dashboard/
│   │   └── kurir/
│   │       └── page.js                 # Dashboard kurir
│   ├── admin/
│   │   ├── page.js                     # Admin overview
│   │   ├── layout.js                   # Admin layout (sidebar)
│   │   ├── keuangan/
│   │   │   └── page.js                 # Admin keuangan
│   │   ├── pengiriman/
│   │   │   └── page.js                 # Admin pengiriman
│   │   ├── users/
│   │   │   └── page.js                 # Admin users
│   │   ├── cabang/
│   │   │   └── page.js                 # Admin cabang
│   │   └── kurir/
│   │       └── page.js                 # Admin kurir
│   └── simulator/
│       └── page.js                     # Simulator (dev)
│
├── components/
│   ├── Navbar.jsx                      # Navigasi global
│   ├── Footer.jsx                      # Footer global
│   ├── AuthGuard.jsx                   # Proteksi halaman berdasarkan role
│   ├── tracking/
│   │   ├── TrackingForm.jsx
│   │   ├── TrackingTimeline.jsx
│   │   ├── BranchRouteProgress.jsx     # Visualisasi rute cabang
│   │   └── ShipmentSummary.jsx
│   ├── shipment/
│   │   ├── ShipmentForm.jsx            # Form buat pengiriman
│   │   └── ShipmentList.jsx            # List pengiriman saya
│   ├── kurir/
│   │   ├── TaskCard.jsx                # Kartu tugas kurir
│   │   └── TaskActions.jsx             # Tombol aksi kurir
│   └── admin/
│       ├── AdminSidebar.jsx            # Sidebar navigasi admin
│       ├── StatCard.jsx                # Kartu statistik
│       ├── RevenueChart.jsx            # Chart keuangan
│       └── ShipmentTable.jsx           # Tabel pengiriman
│
├── lib/
│   ├── api.js                          # Fetch wrapper
│   └── auth.js                         # Auth context & helpers
│
├── public/
├── next.config.mjs
├── package.json
└── .gitignore
```

---

## 4. Design System & Token

*(Sama dengan versi sebelumnya — palet warna, tipografi, border radius, spacing. Lihat DESIGN.md untuk detail lengkap.)*

### 4.1 Palet Warna

| Token | Nilai | Penggunaan |
|---|---|---|
| `--color-primary` | `#000000` | CTA utama, nav, footer |
| `--color-on-primary` | `#ffffff` | Teks di atas primary |
| `--color-ink` | `#000000` | Heading & teks utama |
| `--color-body` | `#5e5e5e` | Teks sekunder |
| `--color-mute` | `#afafaf` | Placeholder |
| `--color-canvas` | `#ffffff` | Background default |
| `--color-canvas-soft` | `#efefef` | Background card soft |

### 4.2 Warna Status Badge

| Status | Warna Badge |
|---|---|
| `PENDING` | Kuning (`bg-yellow-100 text-yellow-800`) |
| `PICKUP` | Orange (`bg-orange-100 text-orange-800`) |
| `IN_TRANSIT` | Biru (`bg-blue-100 text-blue-800`) |
| `AT_BRANCH` | Ungu (`bg-purple-100 text-purple-800`) |
| `OUT_FOR_DELIVERY` | Cyan (`bg-cyan-100 text-cyan-800`) |
| `DELIVERED` | Hijau (`bg-green-100 text-green-800`) |
| `FAILED` | Merah (`bg-red-100 text-red-800`) |

### 4.3 Warna Tipe Pengiriman Badge

| Tipe | Warna Badge |
|---|---|
| Reguler | Abu (`bg-gray-100 text-gray-800`) |
| Nextday | Biru (`bg-blue-100 text-blue-800`) |
| Sameday | Merah (`bg-red-100 text-red-800`) |

---

## 5. Halaman & Route

### 5.1 Landing Page — `/`

**File:** `app/page.js` | **Render:** SSR | **Auth:** Tidak perlu

Halaman pemasaran. Sama dengan desain sebelumnya (Hero, Keunggulan, Layanan Kami) dengan update:
- Section **Layanan Kami** menampilkan tiga tipe pengiriman: Reguler, Nextday (featured), Sameday
- Masing-masing card menampilkan tarif per km dan estimasi waktu
- CTA button: "Kirim Paket Sekarang" → redirect ke `/login` jika belum login, atau `/buat-pengiriman` jika sudah login

---

### 5.2 Login — `/login`

**File:** `app/login/page.js` | **Render:** Client | **Auth:** Tidak perlu

```
┌─────────────────────────────────────────────────────────┐
│  HERO BANNER  (bg-ink, dark)                            │
│  "Masuk ke LogistiKita"                                 │
├─────────────────────────────────────────────────────────┤
│  LOGIN FORM CARD  (floating, centered)                  │
│  [Input Email]                                          │
│  [Input Password]                                       │
│  [Tombol Masuk]                                         │
│  "Belum punya akun? Daftar" → /register                │
└─────────────────────────────────────────────────────────┘
```

**Behavior:**
- Setelah login sukses, simpan token di localStorage
- Redirect berdasarkan role: customer → `/pengiriman-saya`, kurir → `/dashboard/kurir`, admin → `/admin`

---

### 5.3 Register — `/register`

**File:** `app/register/page.js` | **Render:** Client | **Auth:** Tidak perlu

Sama layout dengan login. Form: Nama, Email, Password, Konfirmasi Password.
Hanya untuk customer. Setelah register sukses → auto login → redirect ke `/pengiriman-saya`.

---

### 5.4 Tracking — `/tracking`

**File:** `app/tracking/page.js` | **Render:** Client | **Auth:** **Tidak perlu** (bisa diakses siapa saja)

Update dari versi sebelumnya:
- **Tanpa login**: User input Order ID → lihat tracking
- Token JWT **tidak** diperlukan untuk endpoint tracking (endpoint sekarang publik)
- Tampilan tracking menampilkan **rute cabang** (BranchRouteProgress) selain TrackingTimeline

```
┌─────────────────────────────────────────────────────────┐
│  HERO BANNER  (bg-ink, dark)                            │
│  "Lacak Paket Anda"                                     │
├─────────────────────────────────────────────────────────┤
│  TRACKING FORM CARD                                     │
│  [Input Order ID] [Tombol Lacak]                        │
├─────────────────────────────────────────────────────────┤
│  TRACKING RESULT (conditional)                          │
│                                                         │
│  [BranchRouteProgress]                                  │
│  Bandung ✅ → Cirebon ✅ → Semarang ⏳ → Surabaya ⬜  │
│                                                         │
│  [TrackingTimeline]  [ShipmentSummary]                  │
└─────────────────────────────────────────────────────────┘
```

---

### 5.5 Buat Pengiriman — `/buat-pengiriman`

**File:** `app/buat-pengiriman/page.js` | **Render:** Client | **Auth:** JWT (customer)

```
┌─────────────────────────────────────────────────────────┐
│  HEADER: "Buat Pengiriman Baru"                         │
├─────────────────────────────────────────────────────────┤
│  FORM CARD                                              │
│                                                         │
│  📍 Alamat Asal                                         │
│  [Input Alamat Asal]                                    │
│  [Input Latitude] [Input Longitude]                     │
│  [Tombol: 📍 Gunakan Lokasi Saya] ← Geolocation API   │
│                                                         │
│  📍 Alamat Tujuan                                       │
│  [Input Alamat Tujuan]                                  │
│  [Input Latitude] [Input Longitude]                     │
│                                                         │
│  📦 Tipe Pengiriman                                     │
│  [Radio: ○ Reguler | ○ Nextday | ○ Sameday]            │
│                                                         │
│  ─────────── Estimasi Biaya (live) ───────────         │
│  Jarak: 12.5 km                                         │
│  Ongkir: Rp25.000                                       │
│  Fee Layanan: Rp1.250                                   │
│  Total: Rp26.250                                        │
│  Rute: Bandung → Cirebon → Semarang → Surabaya         │
│                                                         │
│  [Tombol: Kirim Paket]                                  │
└─────────────────────────────────────────────────────────┘
```

**Behavior:**
- Saat user mengisi koordinat asal + tujuan + tipe, panggil `POST /estimasi-ongkir` secara live (debounce 500ms)
- Tampilkan estimasi ongkir, fee, total, dan rute cabang secara real-time
- Saat klik "Kirim Paket": `POST /api/pengiriman`
- Jika Sameday tapi jarak > 50km → tampilkan error "Jarak melebihi batas Sameday"
- Jika Nextday tapi jarak > 250km → tampilkan error "Jarak melebihi batas Nextday"

---

### 5.6 Pengiriman Saya — `/pengiriman-saya`

**File:** `app/pengiriman-saya/page.js` | **Render:** Client | **Auth:** JWT (customer)

```
┌─────────────────────────────────────────────────────────┐
│  HEADER: "Pengiriman Saya"                    [+ Buat]  │
├─────────────────────────────────────────────────────────┤
│  Filter: [Semua ▾] [Tipe ▾]                            │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐    │
│  │ ORD-2026-0001 | Reguler | 🔵 IN_TRANSIT        │    │
│  │ Bandung → Surabaya | Rp26.250                   │    │
│  │ Saat ini: Cabang Cirebon | 17 Jun 2026          │    │
│  │ [Lacak →]                                       │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │ ORD-2026-0002 | Sameday | 🟢 DELIVERED         │    │
│  │ Bandung → Bandung | Rp65.625                    │    │
│  │ Selesai: 16 Jun 2026                            │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

---

### 5.7 Dashboard Kurir — `/dashboard/kurir`

**File:** `app/dashboard/kurir/page.js` | **Render:** Client | **Auth:** JWT (kurir)

**Responsive web** — di desktop tampil layout desktop (sidebar + konten), di layar kecil tampil layout stack vertikal.

#### Layout Desktop

```
┌──────────────────────────────────────────────────────────────────────┐
│  Header: LogistiKita — Dashboard Kurir (Deni Kurir)    [Logout]     │
├───────────────┬──────────────────────────────────────────────────────┤
│               │                                                      │
│  Sidebar:     │  Summary Cards                                       │
│               │  [📦 Tugas: 3] [✅ Selesai Hari Ini: 5]            │
│  📦 Tugas     │                                                      │
│     Aktif (3) │  Task Cards Grid (2-3 kolom di desktop)              │
│               │  ┌──────────────────┐ ┌──────────────────┐          │
│  📋 Riwayat   │  │ SHIP-2026-0042   │ │ SHIP-2026-0039   │          │
│               │  │ 🟡 Menunggu      │ │ 🔵 In Transit    │          │
│  👤 Profil    │  │ Pickup           │ │ Bandung→Surabaya │          │
│               │  │ Sameday ⚡       │ │ Next: Cirebon    │          │
│               │  │ Jl. Merdeka 10   │ │                  │          │
│               │  │                  │ │ Rute: BDG→CRB→   │          │
│               │  │ [✅ Ambil Paket] │ │ SMG→YGY→SBY      │          │
│               │  │                  │ │                  │          │
│               │  │                  │ │ [🏢 Tiba Cabang] │          │
│               │  └──────────────────┘ └──────────────────┘          │
│               │                                                      │
│               │  ┌──────────────────┐                               │
│               │  │ SHIP-2026-0035   │                               │
│               │  │ 🟢 Out for       │                               │
│               │  │ Delivery         │                               │
│               │  │ → Jl. Pahlawan 5 │                               │
│               │  │                  │                               │
│               │  │ [✅ Diterima]    │                               │
│               │  └──────────────────┘                               │
└───────────────┴──────────────────────────────────────────────────────┘
```

#### Layout Layar Kecil

```
┌─────────────────────────────────┐
│ LogistiKita — Kurir    [☰] [👤]│
├─────────────────────────────────┤
│ [📦 Tugas: 3] [✅ Hari ini: 5] │
├─────────────────────────────────┤
│ [Tugas Aktif (3)] [Riwayat]    │ ← tab horizontal
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ SHIP-2026-0042              │ │
│ │ 🟡 Menunggu Pickup | ⚡ SD  │ │
│ │ Jl. Merdeka 10, Bandung     │ │
│ │ → Jl. Asia Afrika, Bandung  │ │
│ │ Rute: Cabang Bandung        │ │
│ │                             │ │
│ │    [✅ Sudah Diambil]       │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ SHIP-2026-0039              │ │
│ │ 🔵 In Transit | 📦 REG     │ │
│ │ Bandung → Surabaya          │ │
│ │ Next: Cabang Cirebon        │ │
│ │ Rute: BDG→CRB→SMG→YGY→SBY │ │
│ │                             │ │
│ │    [🏢 Tiba di Cabang]      │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

#### Aksi Kurir (Tombol per Status)

| Status Paket | Tombol yang Muncul | Endpoint yang Dipanggil |
|---|---|---|
| PENDING (assigned) | `✅ Sudah Diambil` | `PUT /kurir/pickup/:id` |
| IN_TRANSIT | `🏢 Tiba di Cabang` | `PUT /kurir/tiba-cabang/:id` |
| AT_BRANCH (bukan cabang tujuan) | `🚚 Lanjut Transit` | `PUT /kurir/lanjut-transit/:id` |
| AT_BRANCH (cabang tujuan) | `🏃 Antar ke Penerima` | `PUT /kurir/antar/:id` |
| OUT_FOR_DELIVERY | `✅ Sudah Diterima` | `PUT /kurir/delivered/:id` |
| Kapan saja (paket aktif) | `⚠️ Lapor Masalah` | `PUT /kurir/gagal/:id` |

#### Info per Kartu Paket

- Shipment ID + Status badge (warna) + Tipe badge (warna)
- Alamat pengirim + Alamat penerima
- Rute cabang: "BDG → CRB → SMG → YGY → SBY"
- Cabang berikutnya / cabang saat ini
- Tombol aksi (kontekstual berdasarkan status)

---

### 5.8 Dashboard Admin — `/admin/*`

**File:** `app/admin/layout.js` + sub-halaman | **Render:** Client | **Auth:** JWT (admin)

Admin menggunakan layout khusus dengan **sidebar navigasi kiri** (persistent) dan **konten area** di kanan.

#### Admin Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  Header: LogistiKita Admin                          [Hadi] [↪]  │
├──────────────┬───────────────────────────────────────────────────┤
│              │                                                   │
│  Sidebar     │  KONTEN AREA                                      │
│  (dark bg)   │  (berubah sesuai sub-halaman)                     │
│              │                                                   │
│  📊 Overview │                                                   │
│  💰 Keuangan │                                                   │
│  📦 Kirim    │                                                   │
│  👥 Users    │                                                   │
│  🏢 Cabang   │                                                   │
│  🚚 Kurir    │                                                   │
│              │                                                   │
└──────────────┴───────────────────────────────────────────────────┘
```

#### 5.8.1 Admin Overview — `/admin`

**Summary Cards (4 kartu di atas):**

| Card | Data | Warna |
|---|---|---|
| Total Pengiriman | COUNT(shipments) | Biru |
| Pengiriman Aktif | COUNT(status NOT IN DELIVERED, FAILED) | Kuning |
| Total Revenue | SUM(total_biaya) | Hijau |
| Total Kurir | COUNT(users WHERE role=kurir) | Indigo |

**Chart di bawah (2 baris):**
- **Line Chart**: Tren pengiriman per hari (7 hari terakhir)
- **Donut Chart**: Distribusi status (PENDING, IN_TRANSIT, DELIVERED, FAILED, dll)
- **Bar Chart**: Pengiriman per cabang

#### 5.8.2 Admin Keuangan — `/admin/keuangan`

**Summary Cards:**

| Card | Data |
|---|---|
| Total Ongkir Terkumpul | SUM(ongkir) |
| Keuntungan Fee Layanan | SUM(fee_layanan) — **ini keuntungan bersih** |
| Total Ditagih ke User | SUM(total_biaya) |
| Rata-rata Ongkir/Paket | AVG(ongkir) |

**Chart:**
- **Area Chart**: Revenue harian (toggle: 7 hari / 30 hari / semua)
- **Stacked Bar Chart**: Breakdown revenue per tipe pengiriman (Reguler vs Nextday vs Sameday)
- **Donut Chart**: Proporsi revenue per tipe pengiriman
- **Tabel**: Daftar transaksi terakhir (sortable, paginated)

#### 5.8.3 Admin Pengiriman — `/admin/pengiriman`

- Tabel semua shipment (paginated, sortable)
- **Filter**: Status, tipe pengiriman, tanggal, source_app
- **Search**: order_id, shipment_id, nama user
- **Aksi per baris**: Ubah status (dropdown), lihat detail + rute cabang, assign kurir
- Tombol export CSV (opsional)

#### 5.8.4 Admin Users — `/admin/users`

- Tabel semua user
- Filter per role (customer/kurir/admin)
- **Aksi**: Ubah role, aktifkan/nonaktifkan
- **Tambah user**: Form modal — admin bisa menambah kurir atau admin baru

#### 5.8.5 Admin Cabang — `/admin/cabang`

- Tabel semua cabang (nama, kota, koordinat, urutan rute, status)
- Jumlah paket yang sedang di cabang tersebut
- **Aksi**: Tambah cabang, edit, nonaktifkan

#### 5.8.6 Admin Kurir — `/admin/kurir`

- Tabel semua kurir
- Kolom: Nama, tugas aktif, selesai hari ini, selesai bulan ini
- **Aksi**: Lihat riwayat, assign paket ke kurir

---

### 5.9 Simulator Dashboard — `/simulator`

Sama dengan versi sebelumnya (3-Panel: Trigger, SmartBank Monitor, Webhook Receiver) dengan update:
- Form trigger menambahkan field: `lat_asal`, `lng_asal`, `lat_tujuan`, `lng_tujuan`, `tipe_pengiriman`
- Menghilangkan field `nilai_transaksi` dari posisi wajib (menjadi opsional)

---

## 6. Komponen Reusable

### 6.1 `Navbar` — `components/Navbar.jsx`

Update: Menampilkan nama user + tombol logout jika sudah login. Navigasi berubah sesuai role:
- **Belum login**: Beranda, Lacak Paket, Login
- **Customer**: Beranda, Lacak Paket, Pengiriman Saya, Buat Pengiriman, [Nama] ▾ Logout
- **Kurir**: Beranda, Dashboard, [Nama] ▾ Logout
- **Admin**: Beranda, Dashboard Admin, [Nama] ▾ Logout

### 6.2 `Footer` — `components/Footer.jsx`

Sama dengan versi sebelumnya.

### 6.3 `AuthGuard` — `components/AuthGuard.jsx`

Komponen wrapper yang memproteksi halaman berdasarkan role.

**Props:**

| Prop | Tipe | Deskripsi |
|---|---|---|
| `allowedRoles` | `string[]` | Role yang diizinkan, misal `['customer']` |
| `children` | `ReactNode` | Konten halaman |

**Behavior:** Cek token di localStorage → validasi via `GET /api/auth/me` → jika role tidak sesuai, redirect ke `/login`.

### 6.4 `TrackingForm` — `components/tracking/TrackingForm.jsx`

Sama dengan sebelumnya, tanpa kebutuhan JWT token.

### 6.5 `TrackingTimeline` — `components/tracking/TrackingTimeline.jsx`

Update: Status flow diperluas menjadi 7 tahap (PENDING → PICKUP → IN_TRANSIT → AT_BRANCH → OUT_FOR_DELIVERY → DELIVERED).

### 6.6 `BranchRouteProgress` — `components/tracking/BranchRouteProgress.jsx` (BARU)

Visualisasi horizontal progress rute cabang.

**Props:**

| Prop | Tipe | Deskripsi |
|---|---|---|
| `routeCabang` | `Array<{branch, arrived_at, departed_at}>` | Rute cabang dari API |

**Tampilan:**
```
Bandung ✅ ——— Cirebon ✅ ——— Semarang ⏳ ——— Yogyakarta ⬜ ——— Surabaya ⬜
```

### 6.7 `ShipmentForm` — `components/shipment/ShipmentForm.jsx` (BARU)

Form lengkap untuk membuat pengiriman baru.

**State:**
- `alamatAsal`, `latAsal`, `lngAsal`
- `alamatTujuan`, `latTujuan`, `lngTujuan`
- `tipePengiriman` (reguler/nextday/sameday)
- `estimasi` (hasil dari API estimasi-ongkir)

**Behavior:** Live estimasi saat koordinat + tipe terisi (debounce 500ms).

### 6.8 `TaskCard` — `components/kurir/TaskCard.jsx` (BARU)

Kartu tugas untuk dashboard kurir.

**Props:**

| Prop | Tipe | Deskripsi |
|---|---|---|
| `shipment` | `object` | Data shipment |
| `onAction` | `function(action, shipmentId)` | Callback saat kurir klik tombol aksi |

### 6.9 `AdminSidebar` — `components/admin/AdminSidebar.jsx` (BARU)

Sidebar navigasi untuk dashboard admin.

### 6.10 `StatCard` — `components/admin/StatCard.jsx` (BARU)

Kartu statistik untuk dashboard admin.

**Props:** `title`, `value`, `icon`, `color`, `trend` (opsional: persentase perubahan).

### 6.11 `RevenueChart` — `components/admin/RevenueChart.jsx` (BARU)

Chart keuangan menggunakan Chart.js atau Recharts.

---

## 7. Integrasi API & Data Fetching

### 7.1 Base URL

```javascript
const API_BASE = 'http://localhost:3001';
```

### 7.2 Tabel Endpoint yang Dikonsumsi Frontend

| Halaman | Method | URL | Auth | Fungsi |
|---|---|---|---|---|
| Login | `POST` | `/api/auth/login` | ❌ | Login user |
| Register | `POST` | `/api/auth/register` | ❌ | Register customer |
| Global | `GET` | `/api/auth/me` | JWT | Info user login |
| Tracking | `GET` | `/api/tracking/:order_id` | ❌ | Tracking tanpa login |
| Buat Pengiriman | `POST` | `/api/estimasi-ongkir` | ❌ | Estimasi biaya (live) |
| Buat Pengiriman | `POST` | `/api/pengiriman` | JWT | Buat pengiriman baru |
| Buat Pengiriman | `GET` | `/api/cabang/list` | ❌ | Daftar cabang (dropdown) |
| Pengiriman Saya | `GET` | `/api/pengiriman-saya` | JWT | List pengiriman user |
| Kurir | `GET` | `/api/kurir/tugas` | JWT | Tugas aktif kurir |
| Kurir | `GET` | `/api/kurir/riwayat` | JWT | Riwayat kurir |
| Kurir | `PUT` | `/api/kurir/pickup/:id` | JWT | Konfirmasi pickup |
| Kurir | `PUT` | `/api/kurir/tiba-cabang/:id` | JWT | Tiba di cabang |
| Kurir | `PUT` | `/api/kurir/lanjut-transit/:id` | JWT | Lanjut transit |
| Kurir | `PUT` | `/api/kurir/antar/:id` | JWT | Antar ke penerima |
| Kurir | `PUT` | `/api/kurir/delivered/:id` | JWT | Tandai diterima |
| Kurir | `PUT` | `/api/kurir/gagal/:id` | JWT | Lapor masalah |
| Admin | `GET` | `/api/admin/overview` | JWT | Data overview |
| Admin | `GET` | `/api/admin/keuangan` | JWT | Data keuangan |
| Admin | `GET` | `/api/admin/shipments` | JWT | Semua pengiriman |
| Admin | `PUT` | `/api/admin/shipments/:id/status` | JWT | Ubah status |
| Admin | `PUT` | `/api/admin/shipments/:id/assign-kurir` | JWT | Assign kurir |
| Admin | `GET` | `/api/admin/users` | JWT | Semua user |
| Admin | `POST` | `/api/admin/users` | JWT | Tambah user |
| Admin | `PUT` | `/api/admin/users/:id` | JWT | Edit user |
| Admin | `GET` | `/api/admin/cabang` | JWT | Semua cabang |
| Admin | `POST` | `/api/admin/cabang` | JWT | Tambah cabang |
| Admin | `PUT` | `/api/admin/cabang/:id` | JWT | Edit cabang |
| Admin | `GET` | `/api/admin/kurir` | JWT | Semua kurir |
| Simulator | `POST` | `:5500/trigger/marketplace` | ❌ | Trigger marketplace |
| Simulator | `POST` | `:5500/trigger/supplierhub` | ❌ | Trigger supplierhub |
| Simulator | `GET` | `:4000/smartbank/ledger` | ❌ | Ledger SmartBank |
| Simulator | `GET` | `:4000/smartbank/accounts` | ❌ | Saldo akun |
| Simulator | `GET` | `:5000/gateway/logs` | ❌ | Log gateway |

### 7.3 Auth Helper (`lib/auth.js`)

```javascript
// Simpan/ambil token
export function setToken(token) { localStorage.setItem('lk_token', token); }
export function getToken() { return localStorage.getItem('lk_token'); }
export function removeToken() { localStorage.removeItem('lk_token'); }

// Fetch wrapper dengan auth
export async function authFetch(url, options = {}) {
  const token = getToken();
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
}
```

---

## 8. State Management

Sama dengan sebelumnya: **React built-in hooks** (`useState`, `useEffect`, `useCallback`), tidak menggunakan library state management.

Tambahan:
- **Auth state**: user info dan token disimpan di `useState` di level root (atau React Context).
- **Polling kurir**: Dashboard kurir melakukan polling setiap 5 detik untuk refresh tugas aktif.

---

## 9. Alur Pengguna Per Fitur

### 9.1 Alur Login

```
1. User buka /login
2. Input email + password → klik "Masuk"
3. POST /api/auth/login → terima token + user info
4. Simpan token di localStorage
5. Redirect berdasarkan role:
   - customer → /pengiriman-saya
   - kurir → /dashboard/kurir
   - admin → /admin
```

### 9.2 Alur Buat Pengiriman (Customer)

```
1. Customer buka /buat-pengiriman (harus login)
2. Isi alamat asal + koordinat (bisa klik "Gunakan Lokasi Saya")
3. Isi alamat tujuan + koordinat
4. Pilih tipe pengiriman (Reguler/Nextday/Sameday)
5. → Estimasi ongkir ditampilkan real-time (POST /estimasi-ongkir)
6. Klik "Kirim Paket"
7. → POST /api/pengiriman → pembayaran diproses otomatis
8a. [Sukses] → Redirect ke /pengiriman-saya dengan alert sukses
8b. [Gagal] → Tampilkan error (saldo tidak cukup, batas jarak, dll)
```

### 9.3 Alur Tracking (Tanpa Login)

```
1. User buka /tracking (tidak perlu login)
2. Input Order ID → klik "Lacak"
3. → GET /api/tracking/:order_id (tanpa JWT)
4a. [Ditemukan] → Tampilkan BranchRouteProgress + TrackingTimeline + ShipmentSummary
    → Polling 3 detik
4b. [Tidak ditemukan] → Error message
```

### 9.4 Alur Kurir (Pickup → Delivery)

```
1. Kurir login → redirect ke /dashboard/kurir
2. Lihat tugas aktif (GET /kurir/tugas)
3. Paket PENDING → klik "Sudah Diambil" → PUT /kurir/pickup/:id
4. Paket IN_TRANSIT → klik "Tiba di Cabang" → PUT /kurir/tiba-cabang/:id
5. Paket AT_BRANCH (belum cabang tujuan) → klik "Lanjut Transit" → PUT /kurir/lanjut-transit/:id
   (ulangi langkah 4-5 untuk setiap cabang transit)
6. Paket AT_BRANCH (cabang tujuan) → klik "Antar ke Penerima" → PUT /kurir/antar/:id
7. Paket OUT_FOR_DELIVERY → klik "Sudah Diterima" → PUT /kurir/delivered/:id
```

### 9.5 Alur Admin

```
1. Admin login → redirect ke /admin
2. Overview: lihat summary cards + chart tren
3. Keuangan: lihat revenue, fee layanan (keuntungan), chart per tipe pengiriman
4. Pengiriman: kelola semua shipment, ubah status, assign kurir
5. Users: kelola user, tambah kurir/admin baru
6. Cabang: kelola cabang logistik
7. Kurir: lihat performa kurir, assign paket
```

---

## 10. Acceptance Criteria

### 10.1 Landing Page

| # | Kriteria |
|---|---|
| L-01 | Halaman SSR tanpa `'use client'` |
| L-02 | Menampilkan 3 tipe pengiriman (Reguler, Nextday, Sameday) dengan tarif |
| L-03 | CTA mengarah ke `/login` jika belum login, `/buat-pengiriman` jika sudah |

### 10.2 Auth

| # | Kriteria |
|---|---|
| A-01 | Register customer berhasil + auto login |
| A-02 | Login berhasil + redirect sesuai role |
| A-03 | Halaman terproteksi tidak bisa diakses tanpa login |
| A-04 | Token tersimpan di localStorage |
| A-05 | Logout menghapus token + redirect ke landing |

### 10.3 Buat Pengiriman

| # | Kriteria |
|---|---|
| BP-01 | Estimasi ongkir muncul live saat koordinat + tipe terisi |
| BP-02 | Sameday ditolak jika jarak > 50 km |
| BP-03 | Nextday ditolak jika jarak > 250 km |
| BP-04 | Rute cabang ditampilkan di estimasi |
| BP-05 | Pengiriman berhasil → redirect ke /pengiriman-saya |

### 10.4 Tracking

| # | Kriteria |
|---|---|
| T-01 | Bisa diakses **tanpa login** |
| T-02 | BranchRouteProgress menampilkan rute cabang + status per cabang |
| T-03 | Polling 3 detik memperbarui status |

### 10.5 Pengiriman Saya

| # | Kriteria |
|---|---|
| PS-01 | Hanya menampilkan pengiriman milik user yang login |
| PS-02 | Klik "Lacak" mengarah ke tracking detail |
| PS-03 | Tombol "+ Buat" mengarah ke /buat-pengiriman |

### 10.6 Dashboard Kurir

| # | Kriteria |
|---|---|
| K-01 | Menampilkan tugas aktif yang di-assign ke kurir ini |
| K-02 | Tombol aksi muncul sesuai status paket |
| K-03 | Rute cabang dan cabang berikutnya ditampilkan |
| K-04 | **Responsive**: layout desktop di desktop, stack vertikal di layar kecil |
| K-05 | Tab Riwayat menampilkan paket yang sudah selesai |
| K-06 | Polling 5 detik untuk refresh tugas |

### 10.7 Dashboard Admin

| # | Kriteria |
|---|---|
| AD-01 | Sidebar navigasi ke semua sub-halaman |
| AD-02 | Overview: 4 summary cards + 3 chart (line, donut, bar) |
| AD-03 | Keuangan: summary cards revenue + chart area/stacked bar/donut |
| AD-04 | Pengiriman: tabel paginated + filter + search + aksi |
| AD-05 | Users: CRUD user + filter role |
| AD-06 | Cabang: CRUD cabang + jumlah paket di cabang |
| AD-07 | Kurir: list kurir + performa + assign paket |

### 10.8 Komponen

| # | Kriteria |
|---|---|
| C-01 | Navbar berubah sesuai status login dan role |
| C-02 | AuthGuard redirect ke /login jika belum login |
| C-03 | Semua angka Rupiah diformat dengan `toLocaleString('id-ID')` |
| C-04 | Status badge berwarna sesuai mapping (7 status) |
| C-05 | Tipe pengiriman badge berwarna sesuai mapping (3 tipe) |

---

*PRD Frontend ini mengacu pada [README.md](./README.md) sebagai dokumen acuan utama. Semua implementasi harus konsisten dengan spesifikasi di dokumen tersebut.*
