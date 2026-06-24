## 7. Daftar Temuan Masalah Kode

| No | File/Method | Masalah Kode | Prinsip Terkait | Dampak Negatif |
|---|---|---|---|---|
| 1 | `src/controllers/adminController.js` <br> `getOverview()` | Controller menampung banyak baris *query* SQL agregasi secara langsung dan membentuk data laporan. | SRP, MVC, Low Coupling | Controller sangat bergantung pada struktur database (`shipments`, `users`). Sulit untuk melakukan pengujian data agregat tanpa *database*. |
| 2 | `src/controllers/kurirController.js` <br> `_updateStatus()` | Menyatukan otorisasi, validasi, manipulasi beberapa tabel (`shipments`, `tracking_logs`, `shipment_routes`) dalam satu alur monolithic. | SRP, High Cohesion, Clean Code | Fungsionalitas method ini terlalu besar (*God Method*). Sangat rawan terjadi cacat (*bug*) bila ada pembaruan aturan rute logistik. |
| 3 | `src/controllers/adminController.js` <br> `createUser()` | Pencampuran pembacaan _request_, validasi mandiri, *hashing password*, dan query pembuatan *record* user baru. | Separation of Concerns, SRP, Clean Code | Logika pendaftaran user tidak dapat di-reusabilitas (misalnya jika ada endpoint lain untuk pendaftaran Kurir spesifik). |
| 4 | `src/controllers/paymentController.js` <br> `pembayaranLogistik()` | Orkestrasi panggilan ke eksternal (*SmartBank*) yang diikuti logika pencatatan berbagai kondisi *success/failure* langsung ke Model. | SRP, Low Coupling | Logika status pembayaran (*success/failure handling*) terjebak di Controller HTTP dan sulit diuji (*unit testing*) tanpa _mocking_ koneksi jaringan HTTP Response. |
| 5 | `src/controllers/costController.js` <br> `biayaPengiriman()` | Validasi bisnis *hardcoded* (`maxSameday = 50`, `maxNextday = 250`) ditempatkan persis di dalam arus *request* Controller. | Clean Code (Avoid Magic Numbers), SRP | Jika aturan bisnis mengenai batas radius pengiriman berubah, kita harus mengubah file pengatur URL HTTP (Controller). |


## 8. Analisis Before-After Refactoring

### 8.1 Temuan 1 - Query Dashboard Admin Terlalu Banyak di Controller

- **Lokasi Kode**: `src/controllers/adminController.js` method `getOverview()`
- **Kode Sebelum Refactoring**:
```javascript
async getOverview(req, res) {
  try {
    const [[{ total_pengiriman }]] = await db.query('SELECT COUNT(*) as total_pengiriman FROM shipments');
    const [[{ pengiriman_aktif }]] = await db.query('SELECT COUNT(*) as pengiriman_aktif FROM shipments WHERE status NOT IN ("DELIVERED", "FAILED")');
    const [[{ total_revenue }]] = await db.query('SELECT SUM(fee_layanan) as total_revenue FROM shipments WHERE status = "DELIVERED"');
    const [[{ total_kurir }]] = await db.query('SELECT COUNT(*) as total_kurir FROM users WHERE role = "kurir"');
    const [tren_pengiriman] = await db.query(`SELECT DATE_FORMAT(created_at, '%m-%d') as name...`);
    // ... query status_pengiriman ...
    
    respond.success(res, 'Admin Overview', { total_pengiriman, pengiriman_aktif, total_revenue, total_kurir, tren_pengiriman, status_pengiriman });
  } catch (err) {
    respond.error(res, 'FETCH_FAILED', err.message, 500);
  }
}
```
- **Masalah yang Ditemukan**: Controller bertugas ganda menangani siklus interaksi HTTP (*request-response*) dan sekaligus berfungsi sebagai tempat penyimpanan struktur *query* SQL agregat yang kompleks.
- **Prinsip yang Dilanggar**:
  1. Single Responsibility Principle (SRP): Controller menangani lebih dari satu tanggung jawab (HTTP dan Database).
  2. Low Coupling: Controller terikat langsung dan kuat pada detail modul `database` dan sintaks SQL.
- **Strategi Refactoring**:
  1. Buat layer abstraksi tambahan bernama `AdminDashboardService`.
  2. Pindahkan seluruh detail query agregat ke dalam `AdminDashboardService`.
  3. Controller hanya melakukan injeksi *dependency* pada Service, memanggil method dari service, lalu merespons kepada *client*.
- **Kode Sesudah Refactoring**:
```javascript
// src/controllers/adminController.js
const adminDashboardService = require('../services/adminDashboardService');

async getOverview(req, res) {
  try {
    const overviewData = await adminDashboardService.getOverviewStats();
    respond.success(res, 'Admin Overview', overviewData);
  } catch (err) {
    respond.error(res, 'FETCH_FAILED', err.message, 500);
  }
}

// src/services/adminDashboardService.js
class AdminDashboardService {
  async getOverviewStats() {
    const [[{ total_pengiriman }]] = await db.query('SELECT COUNT(*) as total_pengiriman FROM shipments');
    const [[{ total_revenue }]] = await db.query('SELECT SUM(fee_layanan) as total_revenue FROM shipments WHERE status = "DELIVERED"');
    // ... query sisanya dan agregasi ...
    
    return { total_pengiriman, total_revenue, /*...*/ };
  }
}
module.exports = new AdminDashboardService();
```
- **Dampak Perbaikan**: Controller menjadi sangat rapi dan bersih. Apabila skema database untuk dashboard berubah esok hari, tidak akan ada perubahan sebaris pun pada *Controller*, melainkan hanya fokus modifikasi di *Service* atau *Repository*.


### 8.2 Temuan 2 - Monolithic Method untuk Update Status Kurir

- **Lokasi Kode**: `src/controllers/kurirController.js` method `_updateStatus()`
- **Kode Sebelum Refactoring**:
```javascript
async _updateStatus(req, res, status, requiredCurrentStatus, successMessage) {
  try {
    const { id } = req.params; const { branch_id, keterangan } = req.body;
    // Pengecekan otorisasi kurir & validasi status
    const [rows] = await db.query('SELECT * FROM shipments WHERE id = ?', [id]);
    if (rows[0].assigned_kurir_id !== req.user.id) return respond.error(res, 'FORBIDDEN', 'Bukan tugas Anda', 403);
    
    // Update shipment ...
    // Insert tracking log ...
    // Jika AT_BRANCH, update routes ...
    
    respond.success(res, successMessage, { shipment_id: id, status });
  } catch (err) { ... }
}
```
- **Masalah yang Ditemukan**: Method ini merupakan *God Method* yang menangani lima tanggung jawab sekaligus: mengekstraksi objek HTTP, otentikasi kurir, memperbarui status pengiriman, membuat histori rekam jejak (*tracking log*), dan mengubah data progres rute.
- **Prinsip yang Dilanggar**:
  1. Single Responsibility Principle (SRP): Ada lima jenis fungsionalitas dalam satu method.
  2. High Cohesion: Kode dalam block method tidak berfokus pada pekerjaan logis yang terikat erat, melainkan berserakan antar domain (Tracking, Routing, Shipment).
- **Strategi Refactoring**:
  1. Ekstrak proses bisnis tersebut ke sebuah fungsi transaksional di `ShipmentService`.
  2. Controller bertugas mendelegasikan beban validasi dan operasi dengan mem-*parsing* parameter dari URL maupun *body*, ke *service layer*.
- **Kode Sesudah Refactoring**:
```javascript
// src/controllers/kurirController.js
async _updateStatus(req, res, status, requiredCurrentStatus, successMessage) {
  try {
    await kurirService.updateShipmentStatus({
        shipmentId: req.params.id,
        kurirId: req.user.id,
        newStatus: status,
        branchId: req.body.branch_id,
        keterangan: req.body.keterangan || successMessage,
        requiredCurrentStatus
    });
    respond.success(res, successMessage, { shipment_id: req.params.id, status });
  } catch (err) {
    const statusCode = err.code === 'FORBIDDEN' ? 403 : err.code === 'NOT_FOUND' ? 404 : 400;
    respond.error(res, err.code || 'UPDATE_FAILED', err.message, statusCode);
  }
}
```
- **Dampak Perbaikan**: Kepaduan kode (*cohesion*) pada controller membaik drastis karena fokus sebatas *HTTP lifecycle*. Beban logika bisnis kini telah dipindahkan ke lingkungan domain logistiknya tersendiri pada *Service*.


### 8.3 Temuan 3 - Logika Registrasi dan Query Database Bercampur

- **Lokasi Kode**: `src/controllers/adminController.js` method `createUser()`
- **Kode Sebelum Refactoring**:
```javascript
async createUser(req, res) {
  try {
    const { name, email, password, role, branch_id } = req.body;
    if (!name || !email || !password) return respond.error(res, 'VALIDATION_ERROR', 'Wajib diisi', 400);

    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) return respond.error(res, 'DUPLICATE', 'Email sudah terdaftar', 400);

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = `USR-${Date.now()}`;
    await db.query('INSERT INTO users ... VALUES (?, ?, ?, ?, ?, ?)', [userId, name, email, hashedPassword, role, branch_id]);

    respond.success(res, 'User berhasil dibuat', { id: userId, name, email, role }, 201);
  } catch (err) { ... }
}
```
- **Masalah yang Ditemukan**: Aturan bagaimana struktur pengguna (*user*) dibentuk (menghash kata sandi, validasi email, membentuk prefix `USR-`) bocor hingga ke kerangka Controller.
- **Prinsip yang Dilanggar**:
  1. MVC pattern violation: Logika operasional dimasukkan ke tempat yang bukan domain entitas Model atau Service.
  2. Separation of Concerns: Validasi permintaan dan pembuatan *record* database dicampuradukkan.
- **Strategi Refactoring**:
  1. Siapkan sebuah layer operasi `UserService`.
  2. Pindahkan logika validasi email, generator ID, dan hashing `bcrypt` ke dalam *Service*.
  3. Controller hanya melakukan umpan operasional dan *error handling HTTP*.
- **Kode Sesudah Refactoring**:
```javascript
// src/controllers/adminController.js
async createUser(req, res) {
  try {
    const newUser = await userService.registerNewUser(req.body);
    respond.success(res, 'User berhasil dibuat', newUser, 201);
  } catch (err) {
    const statusCode = err.code === 'VALIDATION_ERROR' || err.code === 'DUPLICATE' ? 400 : 500;
    respond.error(res, err.code || 'CREATE_FAILED', err.message, statusCode);
  }
}
```
- **Dampak Perbaikan**: Pembuatan anggota pengguna/user baru dapat dipanggil oleh controller maupun modul mana saja (contohnya `authController`), sehingga terhindar dari penduplikasian kode.


### 8.4 Temuan 4 - Orkestrasi Eksternal dan Pencatatan Log Tertumpuk di Controller

- **Lokasi Kode**: `src/controllers/paymentController.js` method `pembayaranLogistik()`
- **Kode Sebelum Refactoring**:
```javascript
async function pembayaranLogistik(req, res) {
  // ... validasi field HTTP ...
  try {
    const result = await smartbankService.processPayment({ ... });
    if (result.success) {
      await Shipment.updateStatus(order_id, 'PICKUP', result.data.transaction_id);
      await TrackingLog.insert(shipment_id, 'PICKUP', 'Pembayaran ongkir berhasil');
      await TransactionLog.insertSuccess({ ... });
      return respond.success(res, { ... });
    } else {
      await Shipment.updateStatus(order_id, 'FAILED');
      // ... update error history logs ...
      return respond.error(res, 'PAYMENT_FAILED', errData.message, 402);
    }
  } catch (err) { ... }
}
```
- **Masalah yang Ditemukan**: Pengaturan transisi (*state machine*) status logistik yang bergantung pada kesuksesan API Gateway SmartBank ditempatkan pada level Controller. Jika terdapat perubahan cara penulisan log transaksi, controller API yang terkena imbas revisinya.
- **Prinsip yang Dilanggar**:
  1. SRP: Method bertindak sebagai *router request* API dan juga perancang status pesanan/pengiriman.
  2. Low Coupling: *Tightly coupled* terhadap model TrackingLog dan TransactionLog pada tingkat pengontrol.
- **Strategi Refactoring**:
  1. Seluruh orkestrasi skenario pembayaran dan pencatatan state dimasukkan ke dalam subrutin pada `PaymentService`.
  2. Controller hanya bertanggung jawab mengevaluasi format masukan (`req.body`) dan menerima *object exception* atau data terstruktur dari *service*.
- **Kode Sesudah Refactoring**:
```javascript
// src/controllers/paymentController.js
async function pembayaranLogistik(req, res) {
  // ... validasi field HTTP (atau dipindah ke middleware) ...
  try {
    const paymentData = await paymentService.handleLogisticsPayment(req.body);
    return respond.success(res, paymentData);
  } catch (err) {
    return respond.error(res, err.code || 'PAYMENT_FAILED', err.message, err.status || 402, err.data);
  }
}
```
- **Dampak Perbaikan**: Menjadikan logika API internal payment yang bersih, dan lebih adaptif jika kita ingin menguji alur respon dari *payment gateway* tanpa mensimulasikan lingkungan Express Server (meningkatkan *Testability* kode).


### 8.5 Temuan 5 - Business Rules Validasi Jarak Hardcoded di Controller

- **Lokasi Kode**: `src/controllers/costController.js` method `biayaPengiriman()`
- **Kode Sebelum Refactoring**:
```javascript
async biayaPengiriman(req, res) {
  // ...
  const jarakKm = haversineService.calculateDistance(lat_asal, lng_asal, lat_tujuan, lng_tujuan);
  
  const maxSameday = parseInt(process.env.SAMEDAY_MAX_KM) || 50;
  const maxNextday = parseInt(process.env.NEXTDAY_MAX_KM) || 250;

  if (tipe_pengiriman === 'sameday' && jarakKm > maxSameday) {
    return respond.error(res, 'VALIDATION_ERROR', `Jarak terlalu jauh untuk Sameday.`, 400);
  }
  if (tipe_pengiriman === 'nextday' && jarakKm > maxNextday) {
    return respond.error(res, 'VALIDATION_ERROR', `Jarak terlalu jauh untuk Nextday.`, 400);
  }

  const biaya = hitungSemuaBiaya(jarakKm, tipe_pengiriman);
  // ...
}
```
- **Masalah yang Ditemukan**: Menentukan "Apakah boleh dikirim 50 KM menggunakan fitur Same Day?" adalah sebuah ranah penentuan Logika Aturan Bisnis (*Business Logic Requirement*). Syarat bisnis ini mengalami *leak* dengan dituliskannya `if/else` di kerangka kerja Controller HTTP.
- **Prinsip yang Dilanggar**:
  1. Clean Code: Keberadaan konfigurasi aturan (*magic logic constraints*) tidak pada tempat semestinya.
  2. SRP: Membebani controller untuk mengetahui batasan geografis.
- **Strategi Refactoring**:
  1. Pindahkan logika limitasi jarak ke dalam sebuah modul spesifik seperti `costCalculatorService.validateDistanceLimit()`.
  2. Lempar sebuah `Error` exception pada kelas Service apabila batas dilampaui.
  3. Controller hanya melakukan *try/catch* dan mengubah error dari fungsi tersebut ke representasi kode `400 Bad Request`.
- **Kode Sesudah Refactoring**:
```javascript
// src/controllers/costController.js
async biayaPengiriman(req, res) {
  // ...
  try {
    const jarakKm = haversineService.calculateDistance(lat_asal, lng_asal, lat_tujuan, lng_tujuan);
    
    // Validasi domain diturunkan ke service provider bisnis
    costCalculatorService.validateDistanceLimit(tipe_pengiriman, jarakKm);
    const biaya = costCalculatorService.hitungSemuaBiaya(jarakKm, tipe_pengiriman);

    respond.success(res, 'Estimasi biaya pengiriman', { jarak_km: jarakKm, tipe_pengiriman, ongkir: biaya.ongkir });
  } catch (err) {
    respond.error(res, err.code || 'CALCULATION_FAILED', err.message, err.status || 500);
  }
}
```
- **Dampak Perbaikan**: Mengisolasi detail perumusan operasional sehingga file yang mengkalkulasi harga logistik bertugas 100% untuk regulasi biaya dan syarat-syaratnya, tanpa menyentuh *lifecycle handler* HTTP. Mudah dibaca serta mencegah inkonsistensi saat kalkulasi diterapkan di sistem otomatis internal lainnya.
