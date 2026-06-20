'use strict';

const haversineService = require('./haversineService');
const db = require('../config/database');

class RoutingService {
  /**
   * Menentukan cabang asal, tujuan, dan rute cabang yang dilalui.
   * @param {number} latAsal 
   * @param {number} lngAsal 
   * @param {number} latTujuan 
   * @param {number} lngTujuan 
   * @returns {Promise<Object>} Object berisi originBranch, destBranch, dan array routeBranches
   */
  async determineRoute(latAsal, lngAsal, latTujuan, lngTujuan) {
    const [branches] = await db.query('SELECT * FROM branches WHERE is_active = TRUE ORDER BY route_order ASC');
    
    if (branches.length === 0) {
      throw new Error('Tidak ada data cabang aktif di sistem');
    }

    const originBranch = this.findNearestBranch(branches, latAsal, lngAsal);
    const destBranch = this.findNearestBranch(branches, latTujuan, lngTujuan);
    
    let routeBranches = [];
    
    if (originBranch.id === destBranch.id) {
      // Tidak ada transit, hanya 1 cabang
      routeBranches = [originBranch];
    } else if (originBranch.route_order < destBranch.route_order) {
      // Perjalanan dari Barat ke Timur
      routeBranches = branches.filter(b => 
        b.route_order >= originBranch.route_order && 
        b.route_order <= destBranch.route_order
      );
    } else {
      // Perjalanan dari Timur ke Barat
      routeBranches = branches.filter(b => 
        b.route_order <= originBranch.route_order && 
        b.route_order >= destBranch.route_order
      ).sort((a, b) => b.route_order - a.route_order); // Urutkan descending (timur ke barat)
    }

    return {
      originBranch,
      destBranch,
      routeBranches
    };
  }

  /**
   * Mencari cabang terdekat dari suatu titik koordinat
   */
  findNearestBranch(branches, lat, lng) {
    let nearest = null;
    let minDistance = Infinity;

    for (const branch of branches) {
      const distance = haversineService.calculateDistance(lat, lng, branch.latitude, branch.longitude);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = branch;
      }
    }

    return nearest;
  }
}

module.exports = new RoutingService();
