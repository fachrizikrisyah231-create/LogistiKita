'use strict';

class HaversineService {
  /**
   * Menghitung jarak antara dua koordinat menggunakan formula Haversine.
   * @param {number} lat1 Latitude titik asal
   * @param {number} lon1 Longitude titik asal
   * @param {number} lat2 Latitude titik tujuan
   * @param {number} lon2 Longitude titik tujuan
   * @returns {number} Jarak dalam kilometer (pembulatan 1 desimal)
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius bumi dalam km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
      
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c; // Jarak dalam km
    
    return Math.round(distance * 10) / 10; // Pembulatan 1 desimal
  }

  deg2rad(deg) {
    return deg * (Math.PI / 180);
  }
}

module.exports = new HaversineService();
