'use strict';

const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const rateLimitMiddleware = require('../middleware/rateLimitMiddleware');

const authController = require('../controllers/authController');
const shipmentController = require('../controllers/shipmentController');
const costController = require('../controllers/costController');
const trackingController = require('../controllers/trackingController');
const userShipmentController = require('../controllers/userShipmentController');
const kurirController = require('../controllers/kurirController');
const adminController = require('../controllers/adminController');

const router = express.Router();

// ── Auth ─────────────────────────────────────────────────────────────
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/me', authMiddleware, authController.me);

// ── Shipment Request (Integrasi & Publik) ────────────────────────────
router.post('/request-pengiriman', authMiddleware, rateLimitMiddleware, shipmentController.create);
router.post('/estimasi-ongkir', authMiddleware, costController.estimasiBiaya);
router.get('/tracking/:order_id', trackingController.getTracking); // Tanpa login

const Branch = require('../models/Branch');
router.get('/cabang', async (req, res) => {
  const branches = await Branch.getAllActive();
  res.json({ success: true, data: { branches } });
});

// ── Customer Direct Request ──────────────────────────────────────────
router.get('/shipments/me', authMiddleware, roleMiddleware('customer', 'admin'), userShipmentController.getMyShipments);
router.post('/shipments/direct', authMiddleware, roleMiddleware('customer', 'admin'), rateLimitMiddleware, userShipmentController.createPengiriman);

// ── Kurir ────────────────────────────────────────────────────────────
router.get('/kurir/tugas', authMiddleware, roleMiddleware('kurir'), kurirController.getTugas);
router.get('/kurir/riwayat', authMiddleware, roleMiddleware('kurir'), kurirController.getRiwayat);

// Aksi Kurir
router.put('/kurir/shipments/:id/status/pickup', authMiddleware, roleMiddleware('kurir'), kurirController.pickup);
router.put('/kurir/shipments/:id/status/tiba-cabang', authMiddleware, roleMiddleware('kurir'), kurirController.tibaCabang);
router.put('/kurir/shipments/:id/status/lanjut-transit', authMiddleware, roleMiddleware('kurir'), kurirController.lanjutTransit);
router.put('/kurir/shipments/:id/status/antar', authMiddleware, roleMiddleware('kurir'), kurirController.antar);
router.put('/kurir/shipments/:id/status/delivered', authMiddleware, roleMiddleware('kurir'), kurirController.delivered);
router.put('/kurir/shipments/:id/status/gagal', authMiddleware, roleMiddleware('kurir'), kurirController.gagal);

// ── Admin ────────────────────────────────────────────────────────────
router.get('/admin/overview', authMiddleware, roleMiddleware('admin'), adminController.getOverview);
router.get('/admin/keuangan', authMiddleware, roleMiddleware('admin'), adminController.getKeuangan);

router.get('/admin/users', authMiddleware, roleMiddleware('admin'), adminController.getUsers);
router.post('/admin/users', authMiddleware, roleMiddleware('admin'), adminController.createUser);
router.put('/admin/users/:id', authMiddleware, roleMiddleware('admin'), adminController.updateUser);

router.get('/admin/cabang', authMiddleware, roleMiddleware('admin'), adminController.getCabang);
router.post('/admin/cabang', authMiddleware, roleMiddleware('admin'), adminController.createCabang);
router.put('/admin/cabang/:id', authMiddleware, roleMiddleware('admin'), adminController.updateCabang);

router.get('/admin/kurir', authMiddleware, roleMiddleware('admin'), adminController.getKurirList);

router.get('/admin/shipments', authMiddleware, roleMiddleware('admin'), adminController.getShipments);
router.put('/admin/shipments/:id/status', authMiddleware, roleMiddleware('admin'), adminController.updateShipmentStatus);
router.put('/admin/shipments/:id/assign-kurir', authMiddleware, roleMiddleware('admin'), adminController.assignKurir);

module.exports = router;
