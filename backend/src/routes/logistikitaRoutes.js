'use strict';

const express          = require('express');
const authMiddleware   = require('../middleware/authMiddleware');
const rateLimitMiddleware = require('../middleware/rateLimitMiddleware');

const shipmentController = require('../controllers/shipmentController');
const costController     = require('../controllers/costController');
const paymentController  = require('../controllers/paymentController');
const trackingController = require('../controllers/trackingController');
const feeController      = require('../controllers/feeController');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────
// 1. POST /logistikita/request_pengiriman
//    Trigger utama dari Marketplace/SupplierHub.
//    Orkestrasi penuh: hitung biaya → kirim ke SmartBank → update status.
// ─────────────────────────────────────────────────────────────────────
router.post(
  '/request_pengiriman',
  authMiddleware,
  rateLimitMiddleware,
  shipmentController.requestPengiriman
);

// ─────────────────────────────────────────────────────────────────────
// 2. POST /logistikita/biaya_pengiriman
//    Kalkulasi estimasi ongkir. Dapat diakses frontend untuk preview.
//    Tidak memproses pembayaran.
// ─────────────────────────────────────────────────────────────────────
router.post(
  '/biaya_pengiriman',
  authMiddleware,
  costController.hitungBiayaPengiriman
);

// ─────────────────────────────────────────────────────────────────────
// 3. POST /logistikita/pembayaran_logistik
//    Endpoint testing/debug: kirim payment request ke SmartBank secara
//    manual. Dalam alur normal, ini dipanggil oleh shipmentService.
// ─────────────────────────────────────────────────────────────────────
router.post(
  '/pembayaran_logistik',
  authMiddleware,
  paymentController.pembayaranLogistik
);

// ─────────────────────────────────────────────────────────────────────
// 4. GET /logistikita/tracking_status
//    Satu-satunya endpoint yang aktif diakses user via frontend.
//    Mengembalikan status terkini + riwayat pengiriman.
// ─────────────────────────────────────────────────────────────────────
router.get(
  '/tracking_status',
  authMiddleware,
  trackingController.getTrackingStatus
);

// ─────────────────────────────────────────────────────────────────────
// 5. POST /logistikita/biaya_layanan_logistik
//    Kalkulasi fee layanan (5% dari ongkir). Untuk simulasi/debug.
//    Dalam alur normal, ini dipanggil oleh shipmentService.
// ─────────────────────────────────────────────────────────────────────
router.post(
  '/biaya_layanan_logistik',
  authMiddleware,
  feeController.hitungBiayaLayanan
);

// ─────────────────────────────────────────────────────────────────────
// 6. Admin Routes (Bypass Auth untuk kemudahan UI)
// ─────────────────────────────────────────────────────────────────────
const adminController = require('../controllers/adminController');

router.get(
  '/admin/shipments',
  adminController.getAllShipments
);

router.put(
  '/admin/shipments/:order_id/status',
  adminController.updateShipmentStatus
);

module.exports = router;
