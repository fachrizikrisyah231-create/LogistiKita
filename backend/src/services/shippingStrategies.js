'use strict';
require('dotenv').config();

class RegulerStrategy {
  constructor() {
    this.tarifPerKm = parseInt(process.env.ONGKIR_REGULER_PER_KM) || 2000;
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
