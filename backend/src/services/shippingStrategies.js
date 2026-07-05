'use strict';
require('dotenv').config();
const CustomError = require('../utils/CustomError');

class RegulerStrategy {
  constructor() {
    this.tarifPerKm = parseInt(process.env.ONGKIR_REGULER_PER_KM) || 2000;
  }
  validateDistance(jarakKm) {
    return true; // Tidak ada batasan jarak
  }

  calculate(jarakKm) {
    const ongkir = Math.floor(jarakKm * this.tarifPerKm);
    const catatan = `Ongkir reguler (${jarakKm} km x Rp${this.tarifPerKm.toLocaleString('id-ID')} = Rp${ongkir.toLocaleString('id-ID')})`;
    return { ongkir, catatan };
  }
}

class NextdayStrategy {
  constructor() {
    this.tarifPerKm = parseInt(process.env.ONGKIR_NEXTDAY_PER_KM) || 3500;
  }
  validateDistance(jarakKm) {
    const maxKm = parseInt(process.env.NEXTDAY_MAX_KM) || 250;
    if (jarakKm > maxKm) {
      throw new CustomError(`Jarak terlalu jauh untuk Nextday (maks ${maxKm} km). Jarak Anda: ${jarakKm} km.`, 400, 'OUT_OF_RANGE');
    }
    return true;
  }

  calculate(jarakKm) {
    const ongkir = Math.floor(jarakKm * this.tarifPerKm);
    const catatan = `Ongkir nextday (${jarakKm} km x Rp${this.tarifPerKm.toLocaleString('id-ID')} = Rp${ongkir.toLocaleString('id-ID')})`;
    return { ongkir, catatan };
  }
}

class SamedayStrategy {
  constructor() {
    this.tarifPerKm = parseInt(process.env.ONGKIR_SAMEDAY_PER_KM) || 5000;
  }
  validateDistance(jarakKm) {
    const maxKm = parseInt(process.env.SAMEDAY_MAX_KM) || 50;
    if (jarakKm > maxKm) {
      throw new CustomError(`Jarak terlalu jauh untuk Sameday (maks ${maxKm} km). Jarak Anda: ${jarakKm} km.`, 400, 'OUT_OF_RANGE');
    }
    return true;
  }

  calculate(jarakKm) {
    const ongkir = Math.floor(jarakKm * this.tarifPerKm);
    const catatan = `Ongkir sameday (${jarakKm} km x Rp${this.tarifPerKm.toLocaleString('id-ID')} = Rp${ongkir.toLocaleString('id-ID')})`;
    return { ongkir, catatan };
  }
}

module.exports = {
  reguler: new RegulerStrategy(),
  nextday: new NextdayStrategy(),
  sameday: new SamedayStrategy()
};
