'use strict';

const db = require('../config/database');

class KurirOperationService {
  async assignDeliveryRoute(kurirId, routeData) {
    // Alokasi kurir ke pengiriman
    await db.query('UPDATE shipments SET assigned_kurir_id = ? WHERE id = ?', [kurirId, routeData.shipment_id]);
    
    // Pencatatan rute cabang jika ada
    if (routeData.branch_id) {
      await db.query(
        'INSERT INTO shipment_routes (shipment_id, branch_id, status) VALUES (?, ?, ?)',
        [routeData.shipment_id, routeData.branch_id, 'PENDING']
      );
    }
    
    return true;
  }
}

module.exports = new KurirOperationService();
