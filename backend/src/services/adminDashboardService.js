'use strict';

const db = require('../config/database');

class AdminDashboardService {
  async getOverviewStats() {
    // 1. Summary Cards Data
    const [[{ total_pengiriman }]] = await db.query('SELECT COUNT(*) as total_pengiriman FROM shipments');
    const [[{ pengiriman_aktif }]] = await db.query('SELECT COUNT(*) as pengiriman_aktif FROM shipments WHERE status NOT IN ("DELIVERED", "FAILED")');
    const [[{ total_revenue }]] = await db.query('SELECT SUM(fee_layanan) as total_revenue FROM shipments WHERE status = "DELIVERED"');
    const [[{ total_kurir }]] = await db.query('SELECT COUNT(*) as total_kurir FROM users WHERE role = "kurir"');

    // 2. 7-Day Shipment Trend
    const [trendRows] = await db.query(`
      SELECT DATE(created_at) as date, COUNT(*) as count 
      FROM shipments 
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      GROUP BY DATE(created_at) 
      ORDER BY date ASC
    `);

    // Fill in dates with 0 if no shipments occurred
    const tren_pengiriman = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const match = trendRows.find(r => {
        const rDate = r.date instanceof Date ? r.date.toISOString().split('T')[0] : r.date;
        return rDate === dateStr;
      });
      tren_pengiriman.push({
        date: dateStr,
        count: match ? match.count : 0
      });
    }

    // 3. Status Distribution
    const [statusRows] = await db.query('SELECT status, COUNT(*) as count FROM shipments GROUP BY status');
    const distribusi_status = statusRows.map(r => ({
      name: r.status,
      value: r.count
    }));

    return {
      total_pengiriman,
      pengiriman_aktif,
      total_revenue: total_revenue || 0,
      total_kurir,
      tren_pengiriman,
      distribusi_status
    };
  }
}

module.exports = new AdminDashboardService();
