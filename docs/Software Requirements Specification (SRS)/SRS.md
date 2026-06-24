# SOFTWARE REQUIREMENTS SPECIFICATION
Platform LogistiKita

| Atribut | Nilai |
| --- | --- |
| Nama Dokumen | Software Requirements Specification (SRS) Platform LogistiKita |
| Versi | 1.0 - Professional Requirements Baseline |
| Tanggal | 24 Juni 2026 |
| Sistem | LogistiKita / Aplikasi Ekosistem Simulasi Ekonomi UMKM |
| Pemilik Produk | Lab Riset / Dosen Mata Kuliah RPL 2 |
| Target Pembaca | Product owner, developer, QA engineer, maintainer, dan administrator operasional |
| Status | Dokumen kerja untuk baseline requirement dan validasi implementasi |

**Basis Penyusunan**
SRS ini disusun dari dokumentasi (README.md, PRD-frontend.md, PRD-backend.md) aplikasi LogistiKita yang aktif: pola MVC/Microservices pada backend (Node.js/Express) dan frontend (Next.js/React); skema database MySQL; serta kontrak integrasi dengan SmartBank dan API Gateway. Struktur dokumen mengikuti pola SRS yang lazim digunakan tim engineering: tujuan, scope, konteks sistem, aktor, constraint, kebutuhan spesifik, interface, data, business rules, risiko, acceptance criteria, dan traceability.

---

## Daftar Isi

1. Pendahuluan dan Konteks Dokumen
2. Gambaran Produk dan Batas Sistem
3. Konteks Operasional dan Arsitektur
4. Domain Data dan Aturan Bisnis
5. Kebutuhan Fungsional
6. Kebutuhan Non-Fungsional
7. Antarmuka Eksternal
8. Workflow Operasional
9. Risiko, Kontrol, dan Acceptance Criteria
10. Matriks Ketertelusuran
Lampiran A. Glosarium
Lampiran B. Referensi Internal

---

## 1. Pendahuluan dan Konteks Dokumen

### 1.1 Tujuan Dokumen
Dokumen ini mendefinisikan kebutuhan perangkat lunak untuk LogistiKita sebagai komponen operasional dalam ekosistem simulasi ekonomi UMKM pada Tugas Besar Mata Kuliah RPL 2.

SRS ini berfungsi sebagai baseline bersama antara pemilik produk, pengembang, penguji, dan pengelola sistem. Dokumen tidak dimaksudkan sebagai uraian konseptual, melainkan sebagai spesifikasi yang menerjemahkan perilaku aplikasi ke dalam kebutuhan yang dapat dibangun, diuji, dan dipelihara. Setiap kebutuhan dirumuskan agar memiliki ruang lingkup yang jelas, dasar implementasi yang dapat ditelusuri, dan kriteria penerimaan yang dapat diverifikasi.

### 1.2 Ruang Lingkup Produk
LogistiKita adalah aplikasi manajemen pengiriman barang yang berfungsi sebagai *cost driver* dalam ekosistem ekonomi UMKM. Aplikasi ini menyediakan layanan pengiriman barang dengan tiga tipe layanan (Reguler, Nextday, Sameday), dilengkapi fitur tracking melalui sistem cabang transit. Sistem berjalan sebagai aplikasi Microservices dengan Frontend Next.js, Backend Node.js/Express, dan database MySQL.

Sistem LogistiKita bertanggung jawab pada siklus pengiriman: menerima request pengiriman, menghitung jarak dan ongkos kirim menggunakan formula Haversine, menentukan rute antar cabang, mengirimkan request pembayaran ke SmartBank, serta menyediakan pelacakan (tracking) dan dashboard untuk Kurir dan Admin.

### 1.3 Out of Scope
Dokumen ini tidak menspesifikasikan mekanisme pembayaran atau pengelolaan saldo secara langsung, karena fitur tersebut didelegasikan sepenuhnya ke aplikasi SmartBank. LogistiKita tidak menyimpan saldo dompet digital pengguna maupun penjual. 

| Area | Status Scope | Rasional |
| --- | --- | --- |
| Pembayaran Langsung / Dompet | Di luar scope | LogistiKita tidak memproses pembayaran secara langsung. Semua proses potong saldo dilakukan melalui SmartBank. |
| Katalog Produk | Di luar scope | LogistiKita murni sebagai penyedia layanan pengiriman. Katalog produk diurus oleh aplikasi Marketplace atau SupplierHub. |

---

## 2. Gambaran Produk dan Batas Sistem

### 2.1 Product Perspective
Aplikasi ini menempati posisi sebagai layanan logistik dalam ekosistem UMKM. Secara teknis, aplikasi LogistiKita dibagi menjadi frontend dan backend yang berdiri sendiri, dengan database MySQL khusus logistik. LogistiKita terintegrasi dengan API Gateway untuk validasi JWT dan meneruskan permintaan pembayaran ke SmartBank. Marketplace dan SupplierHub memanggil LogistiKita secara otomatis melalui API Gateway.

### 2.2 User Classes dan Karakteristik
Sistem melayani beberapa kelas pengguna dengan hak dan ekspektasi yang berbeda. 

| User Class | Tanggung Jawab | Ekspektasi Sistem | Kontrol Akses |
| --- | --- | --- | --- |
| Customer | Membuat pengiriman mandiri, melacak paket, melihat daftar pengiriman. | Form pemesanan mudah, kalkulasi ongkir akurat, status tracking real-time. | Session customer, tidak dapat mengakses dashboard admin/kurir. |
| Kurir | Melakukan pickup, transit cabang, dan antar ke penerima (delivery). | Dashboard untuk update status mudah (satu klik), daftar tugas yang jelas. | Session kurir melalui /dashboard/kurir. |
| Admin | Memantau seluruh sistem, mengelola user, cabang, pengiriman, dan melihat laporan keuangan. | UI operasional lengkap, ringkasan dan chart informatif. | Session admin melalui /admin. |
| Sistem Integrasi | Membuat request pengiriman secara otomatis dari aplikasi lain. | Kontrak JSON stabil, kalkulasi ongkir otomatis yang deterministik. | Menggunakan token autentikasi integrasi API Gateway. |

### 2.3 Operating Environment
| Komponen | Spesifikasi Saat Ini | Implikasi Requirement |
| --- | --- | --- |
| Runtime Frontend | Next.js dengan React | Server Side Rendering dan routing diatur melalui Next.js App Router. |
| Runtime Backend | Node.js dengan Express | Endpoint API harus tersedia dan dikelompokkan dengan rapi di route Express. |
| Database | MySQL | Skema data harus menjaga integritas tabel `users`, `shipments`, `branches`, dll. |
| Integrasi Eksternal | API Gateway & SmartBank | Pemanggilan eksternal harus ditangani dengan try/catch dan gracefully handling kegagalan. |

---

## 3. Konteks Operasional dan Arsitektur

### 3.1 Architectural Overview
Aplikasi menggunakan pola arsitektur Microservices. Frontend (Next.js) bertugas menampilkan antarmuka dan memanggil Backend API. Backend (Node.js/Express) menangani alur request seperti login, pengisian form pengiriman, update status oleh kurir, dan admin dashboard. Backend terhubung langsung dengan Database MySQL dan API Gateway untuk request pembayaran ke SmartBank.

### 3.2 Data Flow
Alur pengiriman dapat berasal dari dua sumber:
1. **Otomatis**: Marketplace / SupplierHub mengirimkan order. LogistiKita menerima data, menghitung ongkir, meminta SmartBank untuk memproses pembayaran, lalu menyimpan data dan rute cabang.
2. **Manual**: User/Customer membuat pesanan via form UI di LogistiKita. Sistem menghitung ongkir, memproses pembayaran via SmartBank, dan memulai rute pengiriman.

Dalam proses pengiriman, kurir akan memperbarui status (Pickup -> In Transit -> At Branch -> Out for Delivery -> Delivered).

---

## 4. Domain Data dan Aturan Bisnis

### 4.1 Core Domain Entities

| Entitas | Deskripsi | Field Penting |
| --- | --- | --- |
| users | Data pengguna LogistiKita. | `id`, `name`, `email`, `password`, `role` |
| shipments | Data utama paket pengiriman. | `shipment_id`, `order_id`, `tipe_pengiriman`, `jarak_km`, `ongkir`, `fee_layanan`, `status` |
| branches | Referensi cabang transit logistik. | `id`, `name`, `city`, `lat`, `lng`, `route_order` |
| shipment_routes | Rute transit yang harus dilewati paket. | `shipment_id`, `branch_id`, `sequence`, `arrived_at`, `departed_at` |
| tracking_logs | Catatan riwayat status paket. | `shipment_id`, `status`, `notes`, `created_at` |

### 4.2 Business Rules

| ID | Aturan Bisnis | Dampak Implementasi |
| --- | --- | --- |
| BR-01 | Jarak dihitung menggunakan formula Haversine (garis lurus). | Kalkulasi ongkir otomatis di backend tanpa API pihak ketiga (misal Google Maps). |
| BR-02 | Sameday maksimal 50 km, Nextday maksimal 250 km. | Endpoint validasi jarak wajib menolak tipe pengiriman yang melampaui batas jarak. |
| BR-03 | Fee layanan LogistiKita adalah 5% dari total ongkos kirim. | Sistem backend secara eksplisit menghitung fee 5% dan memisahkannya dari ongkir utama dalam kalkulasi total tagihan. |
| BR-04 | Pembayaran dilakukan oleh SmartBank. | LogistiKita akan dianggap berstatus PENDING jika gagal bayar di SmartBank. |

---

## 5. Kebutuhan Fungsional

| ID | Area | Requirement | Priority | Acceptance Criteria |
| --- | --- | --- | --- | --- |
| FR-01 | Authentication | Sistem shall menyediakan login untuk Customer, Kurir, dan Admin. | Must | Pengguna valid dapat mengakses role masing-masing, sistem mengembalikan JWT Token. |
| FR-02 | Shipment Creation | Sistem shall memungkinkan Customer membuat pengiriman dari UI dengan input lokasi koordinat. | Must | Data pengiriman tersimpan, jarak dihitung, dan pembayaran otomatis dipicu. |
| FR-03 | API Shipment | Sistem shall menyediakan endpoint POST `/api/request_pengiriman` untuk sistem eksternal. | Must | LogistiKita dapat menerima order dari Marketplace dan merespons ongkir dan status. |
| FR-04 | Cost Calculation | Sistem shall menghitung jarak Haversine dan ongkir sesuai tarif tipe pengiriman + fee 5%. | Must | Ongkir yang dikembalikan konsisten dengan formula jarak. Terdapat penolakan jarak jauh untuk Sameday/Nextday. |
| FR-05 | Routing | Sistem shall membentuk rute cabang asal ke cabang tujuan berdasarkan `route_order` cabang. | Must | Cabang yang berada di antara asal dan tujuan tercatat di `shipment_routes`. |
| FR-06 | Courier Update | Sistem shall memungkinkan kurir mengupdate status menjadi PICKUP, AT_BRANCH, OUT_FOR_DELIVERY, DELIVERED. | Must | Kurir melihat tombol aksi di dashboard dan status paket termutakhirkan di `tracking_logs`. |
| FR-07 | Public Tracking | Sistem shall menyediakan pelacakan (tracking) publik melalui order ID tanpa login. | Must | Halaman /tracking menampilkan riwayat log yang sesuai order_id. |
| FR-08 | Admin Dashboard | Sistem shall menampilkan halaman admin dengan agregasi keuangan dan ringkasan pengiriman. | Must | Admin dapat memantau revenue 5% logistik dan status paket. |

---

## 6. Kebutuhan Non-Fungsional

| ID | Quality Attribute | Requirement | Verification |
| --- | --- | --- | --- |
| NFR-01 | Security | Sistem shall mengamankan endpoint non-publik dengan JWT validation. | Akses API dashboard kurir/admin tanpa JWT akan ditolak dengan status 401. |
| NFR-02 | Performance | Sistem shall merespons perhitungan ongkir dan routing dalam waktu < 500ms. | Test beban ringan pada endpoint biaya_pengiriman. |
| NFR-03 | Interoperability | Sistem shall mampu menerima JSON payload secara deterministik untuk integrasi API. | Konsumer aplikasi lain berhasil membaca format ongkir. |
| NFR-04 | Data Integrity | Sistem shall menerapkan transaction saat membuat pengiriman untuk mencegah inkonsistensi data. | Jika gagal hitung/simpan, tidak ada data shipment yang terpotong. |

---

## 7. Antarmuka Eksternal

### 7.1 User Interface Requirements
UI dikembangkan dengan Next.js dan Tailwind CSS, difokuskan pada operasi pengiriman logistik.

| UI | Primary User | Requirement |
| --- | --- | --- |
| / | Publik | Landing page menjelaskan layanan LogistiKita (Reguler, Sameday, Nextday). |
| /tracking | Publik | Halaman untuk memasukkan Order ID dan melihat timeline/status pengiriman. |
| /buat-pengiriman | Customer | Form input alamat pengirim, penerima, dan tipe pengiriman dengan estimasi interaktif. |
| /dashboard/kurir | Kurir | Menampilkan kartu tugas pengiriman (pickup, tiba cabang, antar). |
| /admin/* | Admin | Kontrol manajemen untuk mengelola cabang, user, dan ringkasan finansial. |

### 7.2 API Requirements

| Endpoint | Method | Consumer | Contract |
| --- | --- | --- | --- |
| /api/request_pengiriman | POST | Gateway/Marketplace | Mengirim alamat_asal, alamat_tujuan, koordinat, tipe. Mengembalikan order_id, total ongkir, status. |
| /api/biaya_pengiriman | POST | Publik / UI | Endpoint open untuk estimasi tarif sebelum membuat pesanan valid. |

### 7.3 Data Exchange Contract
Kontrak JSON public untuk API `biaya_pengiriman` dan `request_pengiriman` mengikuti aturan kalkulasi harga. Contoh payload hitung biaya:
```json
{
  "lat_asal": -6.9175,
  "lng_asal": 107.6191,
  "lat_tujuan": -7.2575,
  "lng_tujuan": 112.7521,
  "tipe_pengiriman": "reguler"
}
```

---

## 8. Workflow Operasional

| Workflow | Trigger | Main Success Scenario | Failure/Control |
| --- | --- | --- | --- |
| Pengiriman Otomatis (Marketplace) | Notifikasi berhasil bayar Checkout. | Marketplace mengirim POST order -> LogistiKita hitung jarak -> API Payment ke SmartBank -> LogistiKita set PENDING/PICKUP. | SmartBank API gagal, LogistiKita merespons status pembayaran gagal ke Marketplace. |
| Pickup oleh Kurir | Kurir menekan "Pickup" | Kurir mengambil barang, sistem mengubah status menjadi IN_TRANSIT. | ID Pengiriman tidak valid atau sudah dipickup kurir lain. |
| Antar Cabang | Kurir menekan "Tiba di Cabang" | Kurir transit melaporkan kedatangan, paket dicatat di cabang tersebut. | - |
| Pengiriman Diterima | Kurir menekan "Delivered" | Paket tiba, status DELIVERED, mencatat waktu selesai. | - |

---

## 9. Risiko, Kontrol, dan Acceptance Criteria

| Risk ID | Risiko | Kontrol Wajib | Acceptance Criteria |
| --- | --- | --- | --- |
| R-01 | Manipulasi jarak koordinat. | Jarak mutlak dihitung oleh backend menggunakan Haversine. | Mengubah field payload jarak manual via frontend diabaikan oleh backend. |
| R-02 | Pembayaran gagal (saldo kurang) dari SmartBank. | LogistiKita menunggu callback/response SmartBank sebelum confirm shipment. | Jika saldo kurang, LogistiKita melabeli FAILED dan tidak menjadwalkan pickup kurir. |
| R-03 | Paket dikirim tipe Nextday untuk jarak luar pulau. | Backend menolak jika jarak Nextday > 250km atau Sameday > 50km. | Mengembalikan JSON Error 400 'Jarak melebihi batas'. |

---

## 10. Matriks Ketertelusuran

| Objective | Requirement IDs | Evidence / Verification |
| --- | --- | --- |
| Menerima order otomatis dari platform belanja. | FR-03, FR-04, NFR-03 | Submit JSON /api/request_pengiriman; response ongkir konsisten. |
| Mengamankan biaya layanan operasional. | BR-03, FR-08 | Dashboard Admin menampilkan kalkulasi revenue 5% tepat. |
| Memberikan transparansi status ke end-user. | FR-06, FR-07 | Status tracking berubah sesuai penekanan tombol oleh akun Kurir di UI. |

---

## Lampiran A. Glosarium

| Istilah | Definisi Operasional |
| --- | --- |
| SmartBank | Aplikasi layanan keuangan sentral di ekosistem tempat pemotongan ongkir dieksekusi. |
| Haversine | Formula matematika untuk menghitung jarak lingkaran besar antara dua titik pada permukaan bumi dari koordinat bujur dan lintang mereka. |
| Route Order | Angka urutan (sequence) geografis dari barat ke timur yang menentukan hierarki transit cabang. |
| Cost Driver | Peran aplikasi LogistiKita yang berkontribusi pada pengeluaran finansial pengiriman dalam simulasi. |

## Lampiran B. Referensi Internal

| Artefak | Relevansi |
| --- | --- |
| README.md | Deskripsi umum aplikasi, fitur, struktur, aturan bisnis ongkir, dan flow. |
| PRD-frontend.md | Dokumen spesifikasi kebutuhan produk khusus antarmuka pengguna LogistiKita. |
| PRD-backend.md | Dokumen spesifikasi kebutuhan produk khusus sistem server dan API LogistiKita. |
