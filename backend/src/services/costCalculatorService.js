'use strict';

require('dotenv').config();

const strategies = require('./shippingStrategies');
const CustomError = require('../utils/CustomError');
const FEE_LAYANAN_PERCENTAGE = parseFloat(process.env.FEE_LAYANAN_PERCENTAGE) || 0.05;

/**
 * Menghitung ongkir berdasarkan jarak dan tipe pengiriman.
 */
function getStrategy(tipePengiriman) {
  const strategy = strategies[tipePengiriman.toLowerCase()];
  if (!strategy) {
    throw new CustomError('Tipe pengiriman tidak valid', 400, 'INVALID_SHIPPING_TYPE');
  }
  return strategy;
}

function hitungOngkir(jarakKm, tipePengiriman = 'reguler') {
  const strategy = getStrategy(tipePengiriman);
  return strategy.calculate(jarakKm);
}

/**
 * Menghitung fee layanan LogistiKita dari ongkir.
 */
function hitungFeeLayanan(ongkir) {
  const fee_layanan = Math.floor(ongkir * FEE_LAYANAN_PERCENTAGE);
  return {
    fee_layanan,
    catatan: `Fee layanan LogistiKita (${FEE_LAYANAN_PERCENTAGE * 100}% x Rp${ongkir.toLocaleString('id-ID')} = Rp${fee_layanan.toLocaleString('id-ID')})`,
  };
}

/**
 * Menghitung lengkap: ongkir + fee layanan + total biaya.
 */
function hitungSemuaBiaya(jarakKm, tipePengiriman) {
  const { ongkir, catatan: catatan_ongkir } = hitungOngkir(jarakKm, tipePengiriman);
  const { fee_layanan, catatan: catatan_fee } = hitungFeeLayanan(ongkir);
  const total_biaya = ongkir + fee_layanan;

  return { ongkir, fee_layanan, total_biaya, catatan_ongkir, catatan_fee };
}

module.exports = { hitungOngkir, hitungFeeLayanan, hitungSemuaBiaya, getStrategy };
