## 7. Daftar Temuan Masalah Kode

| No | File/Method | Masalah Kode | Prinsip Terkait | Dampak Negatif |
|---|---|---|---|---|
| 1 | `backend/src/controllers/adminController.js` <br> `getOverview()` | Controller menampung banyak baris *query* SQL agregasi secara langsung dan membentuk data laporan. | SRP, High Cohesion, MVC | Controller menjadi sangat gemuk (*Fat Controller*). Sulit untuk melakukan pengujian data tanpa mensimulasikan panggilan HTTP. |
| 2 | `backend/src/services/costCalculatorService.js` <br> `hitungOngkir()` | Menggunakan percabangan `if-else` bertingkat untuk menghitung biaya berdasarkan tiap jenis pengiriman (Reguler, Sameday, Nextday). | OCP, Clean Code | Menambah tipe pengiriman baru akan memaksa kita memodifikasi ulang kode yang sudah stabil. |
| 3 | `backend/src/services/userService.js` <br> `assignDeliveryRoute()` | Kelas `UserService` melayani pendaftaran kustomer dan sekaligus memuat logika penugasan rute pengiriman kurir. | ISP, Separation of Concerns | Kustomer biasa terikat pada fitur rute kurir yang tidak pernah mereka butuhkan. |
| 4 | `backend/src/services/paymentService.js` <br> `processLogisticsPayment()` | Logika layanan secara langsung menginisialisasi kelas penyedia spesifik (`new SmartBankAPI()`) di dalam fungsinya. | DIP, Low Coupling | Sistem terikat kuat (*tightly coupled*) dengan satu penyedia pembayaran. Sangat sulit jika ingin bermigrasi ke penyedia lain. |
| 5 | `backend/src/controllers/kurirController.js` <br> `_updateStatus()` | Menyatukan otorisasi, perubahan pengiriman, pembuatan histori *tracking*, dan penentuan logika transisi rute dalam satu alur besar. | SRP, High Cohesion | Fungsi membesar secara tumpang tindih (*God Method*). Perubahan pada alur rute atau *tracking* rawan menciptakan cacat (*bug*) tambahan. |

## 8. Analisis Before-After Refactoring

### 8.1 Temuan 1 - Query Dashboard Admin Terlalu Banyak di Controller

- **Lokasi Kode**: `backend/src/controllers/adminController.js` dan method `getOverview()`
- **Kode Sebelum Refactoring**:
```javascript
async getOverview(req, res) {
  try {
    const [[{ total_pengiriman }]] = await db.query('SELECT COUNT(*) as total_pengiriman FROM shipments');
    const [[{ pengiriman_aktif }]] = await db.query('SELECT COUNT(*) as pengiriman_aktif FROM shipments WHERE status NOT IN ("DELIVERED", "FAILED")');
    const [[{ total_revenue }]] = await db.query('SELECT SUM(fee_layanan) as total_revenue FROM shipments WHERE status = "DELIVERED"');
    
    respond.success(res, 'Admin Overview', { total_pengiriman, pengiriman_aktif, total_revenue });
  } catch (err) {
    respond.error(res, 'FETCH_FAILED', err.message, 500);
  }
}
```
- **Masalah yang Ditemukan**: Controller bertugas ganda menangani siklus interaksi HTTP (*request-response*) dan sekaligus berfungsi sebagai tempat penyimpanan struktur *query* SQL agregat yang kompleks.
- **Prinsip yang Dilanggar**:
  1. Single Responsibility Principle (SRP): Controller menangani lebih dari satu tanggung jawab (HTTP dan Database).
  2. MVC Pattern Violation: Logika *query* yang seharusnya menjadi ranah Model/Repository bocor hingga ke Controller.
- **Strategi Refactoring**:
  1. Buat layer abstraksi tambahan bernama `AdminDashboardService` (atau Repository).
  2. Pindahkan seluruh detail eksekusi query agregat SQL ke dalam `AdminDashboardService`.
  3. Controller hanya melakukan pemanggilan fungsi dari *Service* tersebut lalu merespons kepada *client*.
- **Kode Sesudah Refactoring**:
```javascript
// backend/src/controllers/adminController.js
const adminDashboardService = require('../services/adminDashboardService');

async getOverview(req, res) {
  try {
    const overviewData = await adminDashboardService.getOverviewStats();
    respond.success(res, 'Admin Overview', overviewData);
  } catch (err) {
    respond.error(res, 'FETCH_FAILED', err.message, 500);
  }
}

// backend/src/services/adminDashboardService.js
class AdminDashboardService {
  async getOverviewStats() {
    const [[{ total_pengiriman }]] = await db.query('SELECT COUNT(*) as total_pengiriman FROM shipments');
    const [[{ total_revenue }]] = await db.query('SELECT SUM(fee_layanan) as total_revenue FROM shipments WHERE status = "DELIVERED"');
    
    return { total_pengiriman, total_revenue };
  }
}
module.exports = new AdminDashboardService();
```
- **Dampak Perbaikan**: Controller menjadi sangat rapi dan bersih. Apabila skema tabel database untuk dashboard berubah esok hari, tidak akan ada perubahan pada kerangka HTTP Controller, melainkan hanya di Service.

### 8.2 Temuan 2 - Percabangan If-Else yang Menumpuk untuk Biaya Pengiriman

- **Lokasi Kode**: `backend/src/services/costCalculatorService.js` dan method `hitungOngkir()`
- **Kode Sebelum Refactoring**:
```javascript
class CostCalculatorService {
  hitungOngkir(tipe, jarak, berat) {
    if (tipe === 'sameday') {
      return (jarak * 5000) + (berat * 2000);
    } else if (tipe === 'nextday') {
      return (jarak * 3000) + (berat * 1500);
    } else if (tipe === 'reguler') {
      return (jarak * 2000) + (berat * 1000);
    }
    throw new Error('Tipe pengiriman tidak valid');
  }
}
```
- **Masalah yang Ditemukan**: Fungsi kalkulasi memuat logika yang terikat kuat pada daftar layanan secara kaku (*hardcoded*). Jika fitur pengiriman baru (seperti "Kargo Ekstra Besar") ditambahkan, fungsi ini harus dibongkar dan dimodifikasi lagi.
- **Prinsip yang Dilanggar**:
  1. Open/Closed Principle (OCP): Kelas tidak tertutup dari modifikasi ketika ada ekstensi fitur baru.
  2. Clean Code: Terjadinya tumpukan blok kondisi (*Switch/If-Else smell*).
- **Strategi Refactoring**:
  1. Terapkan *Strategy Pattern* dengan membuat kelas antarmuka konseptual untuk `ShippingStrategy`.
  2. Ekstrak perhitungan setiap layanan ke kelas terpisah (`SamedayStrategy`, `RegulerStrategy`).
  3. Lakukan inisiasi pemetaan (*Map/Dictionary*) agar Service bisa memanggil perhitungan secara polimorfisme.
- **Kode Sesudah Refactoring**:
```javascript
// backend/src/services/shippingStrategies.js
class SamedayStrategy {
  calculate(jarak, berat) { return (jarak * 5000) + (berat * 2000); }
}
class RegulerStrategy {
  calculate(jarak, berat) { return (jarak * 2000) + (berat * 1000); }
}

// backend/src/services/costCalculatorService.js
const strategies = {
  sameday: new SamedayStrategy(),
  reguler: new RegulerStrategy()
};

class CostCalculatorService {
  hitungOngkir(tipe, jarak, berat) {
    const strategy = strategies[tipe];
    if (!strategy) throw new Error('Tipe pengiriman tidak valid');
    return strategy.calculate(jarak, berat);
  }
}
```
- **Dampak Perbaikan**: Penambahan fitur tipe pengiriman baru tidak lagi memodifikasi file `costCalculatorService.js` yang sudah diuji stabil. Kita hanya perlu mendaftarkan *class* strategi yang baru.

### 8.3 Temuan 3 - Fat Service (Fungsi Kurir dan Kustomer Digabung)

- **Lokasi Kode**: `backend/src/services/userService.js` dan method `assignDeliveryRoute()`
- **Kode Sebelum Refactoring**:
```javascript
class UserService {
  async registerCustomer(userData) { /* logika daftar kustomer */ }
  async resetPassword(email) { /* logika reset sandi */ }
  
  // Metode khusus Kurir
  async assignDeliveryRoute(kurirId, routeData) {
    await db.query('INSERT INTO shipment_routes ...', [kurirId, routeData]);
  }
}
```
- **Masalah yang Ditemukan**: Kelas `UserService` terlalu membengkak (Fat Class). Kelas ini menampung fungsionalitas manajemen autentikasi Kustomer umum sekaligus mengurus logika operasional teknis yang murni eksklusif untuk Kurir logistik.
- **Prinsip yang Dilanggar**:
  1. Interface Segregation Principle (ISP): Modul atau entitas yang menggunakan layanan kustomer dipaksa memiliki kebergantungan parsial pada modul kurir.
  2. High Cohesion: Kode dalam kelas ini memiliki tujuan yang bercabang dan tidak menyatu (kurang kohesif).
- **Strategi Refactoring**:
  1. Pecah `UserService` menjadi layanan yang berfokus ke perannya.
  2. Buat `CustomerAuthService` khusus untuk registrasi/sandi.
  3. Buat `KurirOperationService` dan pindahkan metode `assignDeliveryRoute` secara eksklusif ke sana.
- **Kode Sesudah Refactoring**:
```javascript
// backend/src/services/customerAuthService.js
class CustomerAuthService {
  async registerCustomer(userData) { /* logika daftar kustomer */ }
  async resetPassword(email) { /* logika reset sandi */ }
}

// backend/src/services/kurirOperationService.js
class KurirOperationService {
  async assignDeliveryRoute(kurirId, routeData) {
    await db.query('INSERT INTO shipment_routes ...', [kurirId, routeData]);
  }
}
```
- **Dampak Perbaikan**: Pemisahan yang tegas membuat pemeliharaan fitur operasional kurir sama sekali tidak akan menanggung risiko mengganggu *bug* pada fitur pendaftaran/profil kustomer biasa.

### 8.4 Temuan 4 - Inisiasi Hardcoded ke Pihak Ketiga (Payment Gateway)

- **Lokasi Kode**: `backend/src/services/paymentService.js` dan method `processLogisticsPayment()`
- **Kode Sebelum Refactoring**:
```javascript
const SmartBankAPI = require('../third-party/SmartBankAPI');

class PaymentService {
  async processLogisticsPayment(orderId, amount) {
    const gateway = new SmartBankAPI(); // Keterikatan langsung (Hardcoded)
    const result = await gateway.deductFunds(amount);
    return result;
  }
}
```
- **Masalah yang Ditemukan**: Kelas tingkat tinggi (`PaymentService`) secara statis membentuk *instance* dari pustaka pembayaran spesifik (`SmartBankAPI`). Ini berarti LogistiKita tidak fleksibel jika sewaktu-waktu ingin beralih dari SmartBank ke penyedia lain (misalnya Midtrans).
- **Prinsip yang Dilanggar**:
  1. Dependency Inversion Principle (DIP): Modul tingkat tinggi (*High-level*) bergantung pada detail modul tingkat rendah (*Low-level/Concrete class*).
  2. Low Coupling: *Tightly coupled* terhadap kelas eksternal.
- **Strategi Refactoring**:
  1. Buat abstraksi desain untuk *gateway* pembayaran, dan terapkan injeksi ketergantungan (*Dependency Injection*) pada konstruktor `PaymentService`.
  2. Sisipkan implementasi konkret (contohnya kelas adapter dari *SmartBank* atau *Midtrans*) melalui *framework* saat layanan diinjeksi.
- **Kode Sesudah Refactoring**:
```javascript
// backend/src/services/paymentService.js
class PaymentService {
  // gateway mematuhi abstraksi/interface (misal method pay())
  constructor(paymentGatewayAdapter) {
    this.gateway = paymentGatewayAdapter; 
  }

  async processLogisticsPayment(orderId, amount) {
    // Bergantung pada abstraksi
    const result = await this.gateway.pay(amount);
    return result;
  }
}

// Inisialisasi di tempat lain (Misal: Dependency Container)
// const activeGateway = new SmartBankAdapter();
// const paymentService = new PaymentService(activeGateway);
```
- **Dampak Perbaikan**: Modul pembayaran kini kebal terhadap perubahan *vendor* pembayaran pihak ketiga. Kita bisa melakukan pergantian *Gateway* secara dinamis tanpa menyentuh dan berisiko merusak logika di dalam `PaymentService`.

### 8.5 Temuan 5 - God Method pada Update Status Kurir

- **Lokasi Kode**: `backend/src/controllers/kurirController.js` dan method `_updateStatus()`
- **Kode Sebelum Refactoring**:
```javascript
  async _updateStatus(req, res, status, requiredCurrentStatus, successMessage) {
    // ... validasi & otorisasi user ...
    await db.query(`UPDATE shipments SET status = ? WHERE id = ?`, [status, id]);
    await db.query('INSERT INTO tracking_logs ...', [id, status, keterangan]);

    if (status === 'AT_BRANCH' && branch_id) {
      await ShipmentRoute.updateArrived(id, branch_id);
    }
    if (status === 'IN_TRANSIT' && shipment.status === 'AT_BRANCH') {
      await ShipmentRoute.updateDeparted(id, shipment.current_branch_id);
    }
    respond.success(res, successMessage, { shipment_id: id, status });
  }
```
- **Masalah yang Ditemukan**: Method `_updateStatus` bertindak sebagai *God Method*. Fungsi ini menangani otorisasi *user*, modifikasi model *shipments*, penulisan *tracking logs*, serta penentuan logika *routing* secara spesifik (jika *AT_BRANCH* lakukan ini, jika *IN_TRANSIT* lakukan itu) di ranah HTTP Controller.
- **Prinsip yang Dilanggar**:
  1. Single Responsibility Principle (SRP): Fungsi ini mengambil alih 4 tanggung jawab sekaligus dalam satu tempat.
  2. High Cohesion: Kode dalam fungsi ini berantakan (*scattered*) karena menyentuh terlalu banyak domain (Rute, Histori, Pengiriman) di luar tanggung jawab *Controller* utamanya.
- **Strategi Refactoring**:
  1. Buat layer abstraksi tambahan bernama `ShipmentUpdateService`.
  2. Ekstrak operasi validasi rute, pembuatan *tracking log*, dan pembaruan pengiriman menjadi fungsi transaksional yang utuh di dalam *Service*.
  3. Controller murni hanya berfungsi sebagai penerima beban HTTP (*request/response*) dan memanggil eksekusi layanan tersebut.
- **Kode Sesudah Refactoring**:
```javascript
// backend/src/controllers/kurirController.js
  async _updateStatus(req, res, status, requiredCurrentStatus, successMessage) {
    try {
      await shipmentUpdateService.updateStatus({
        shipmentId: req.params.id,
        kurirId: req.user.id,
        newStatus: status,
        branchId: req.body.branch_id,
        keterangan: req.body.keterangan || successMessage,
        requiredCurrentStatus
      });
      respond.success(res, successMessage, { shipment_id: req.params.id, status });
    } catch (err) {
      respond.error(res, err.code || 'UPDATE_FAILED', err.message, 500);
    }
  }
```
- **Dampak Perbaikan**: Kepaduan (*cohesion*) pada *controller* HTTP meningkat drastis. Perubahan logika aturan rute (*routing*) atau format penulisan log sistem di masa depan tidak lagi merusak *controller* HTTP, melainkan dapat diatur terpusat di `ShipmentUpdateService`.
