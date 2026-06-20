'use strict';

const db = require('../config/database');

class ShipmentRoute {
  async getByShipmentId(shipmentId) {
    const query = `
      SELECT sr.*, b.name as branch_name, b.city as branch_city, b.latitude, b.longitude
      FROM shipment_routes sr
      JOIN branches b ON sr.branch_id = b.id
      WHERE sr.shipment_id = ?
      ORDER BY sr.sequence ASC
    `;
    const [rows] = await db.query(query, [shipmentId]);
    return rows;
  }

  async createBatch(shipmentId, routeBranches) {
    if (!routeBranches || routeBranches.length === 0) return;

    const values = routeBranches.map((branch, index) => [
      shipmentId,
      branch.id,
      index + 1
    ]);

    const query = 'INSERT INTO shipment_routes (shipment_id, branch_id, sequence) VALUES ?';
    const [result] = await db.query(query, [values]);
    return result.affectedRows;
  }

  async updateArrived(shipmentId, branchId) {
    const query = 'UPDATE shipment_routes SET arrived_at = NOW() WHERE shipment_id = ? AND branch_id = ? AND arrived_at IS NULL';
    const [result] = await db.query(query, [shipmentId, branchId]);
    return result.affectedRows > 0;
  }

  async updateDeparted(shipmentId, branchId) {
    const query = 'UPDATE shipment_routes SET departed_at = NOW() WHERE shipment_id = ? AND branch_id = ? AND departed_at IS NULL';
    const [result] = await db.query(query, [shipmentId, branchId]);
    return result.affectedRows > 0;
  }
}

module.exports = new ShipmentRoute();
