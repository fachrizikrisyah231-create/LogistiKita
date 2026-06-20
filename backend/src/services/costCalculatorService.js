'use strict';

require('dotenv').config();

const ONGKIR_REGULER_PER_KM = parseInt(process.env.ONGKIR_REGULER_PER_KM) || 2000;
const ONGKIR_NEXTDAY_PER_KM = parseInt(process.env.ONGKIR_NEXTDAY_PER_KM) || 3500;
const ONGKIR_SAMEDAY_PER_KM = parseInt(process.env.ONGKIR_SAMEDAY_PER_KM) || 5000;
const FEE_LAYANAN_PERCENTAGE = parseFloat(process.env.FEE_LAYANAN_PERCENTAGE) || 0.05;

/**
 * Menghitung ongkir berdasarkan jarak dan tipe pengiriman.
 */
function hitungOngkir(jarakKm, tipePengiriman = 'reguler') {
  let tarifPerKm;
  switch (tipePengiriman) {
    case 'nextday': tarifPerKm = ONGKIR_NEXTDAY_PER_KM; break;
    case 'sameday': tarifPerKm = ONGKIR_SAMEDAY_PER_KM; break;
    case 'reguler':
    default:
      tarifPerKm = ONGKIR_REGULER_PER_KM; break;
  }

  const ongkir = Math.floor(jarakKm * tarifPerKm);
  const catatan = `Ongkir ${tipePengiriman} (${jarakKm} km x Rp${tarifPerKm.toLocaleString('id-ID')} = Rp${ongkir.toLocaleString('id-ID')})`;

  return { ongkir, catatan };
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

module.exports = { hitungOngkir, hitungFeeLayanan, hitungSemuaBiaya };
