'use strict';

const db = require('../config/database');

class AdminFinanceService {
  async generateFinanceReport() {
    const [transactions] = await db.query('SELECT * FROM transaction_logs ORDER BY created_at DESC LIMIT 100');
    
    // Calculate totals
    const [[totals]] = await db.query(`
      SELECT 
        SUM(amount) as total_pendapatan, 
        SUM(ongkir) as total_ongkir, 
        SUM(fee_layanan) as total_fee, 
        AVG(ongkir) as rata_rata_ongkir 
      FROM transaction_logs 
      WHERE payment_status = "SUCCESS"
    `);

    // Statistics by shipping type
    const [typeRows] = await db.query(`
      SELECT 
        s.tipe_pengiriman, 
        SUM(t.amount) as total_revenue, 
        SUM(t.fee_layanan) as fee_revenue, 
        SUM(t.ongkir) as ongkir_revenue, 
        COUNT(*) as count 
      FROM transaction_logs t 
      JOIN shipments s ON t.shipment_id = s.id 
      WHERE t.payment_status = "SUCCESS" 
      GROUP BY s.tipe_pengiriman
    `);

    // 30-Day Daily Revenue Trend
    const [dailyRows] = await db.query(`
      SELECT 
        DATE(t.created_at) as date, 
        SUM(t.amount) as revenue, 
        SUM(t.fee_layanan) as fee, 
        SUM(t.ongkir) as ongkir 
      FROM transaction_logs t 
      WHERE t.payment_status = "SUCCESS" 
        AND t.created_at >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
      GROUP BY DATE(t.created_at) 
      ORDER BY date ASC
    `);

    // Fill in missing dates for the last 30 days
    const daily_revenue = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const match = dailyRows.find(r => {
        const rDate = r.date instanceof Date ? r.date.toISOString().split('T')[0] : r.date;
        return rDate === dateStr;
      });
      daily_revenue.push({
        date: dateStr,
        revenue: match ? parseFloat(match.revenue) : 0,
        fee: match ? parseFloat(match.fee) : 0,
        ongkir: match ? parseFloat(match.ongkir) : 0
      });
    }

    return {
      total_pendapatan: totals.total_pendapatan || 0,
      total_ongkir: totals.total_ongkir || 0,
      total_fee: totals.total_fee || 0,
      rata_rata_ongkir: totals.rata_rata_ongkir || 0,
      transactions,
      stats_by_type: typeRows,
      daily_revenue
    };
  }
}

module.exports = new AdminFinanceService();
