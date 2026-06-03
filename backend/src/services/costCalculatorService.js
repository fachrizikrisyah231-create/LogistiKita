'use strict';

require('dotenv').config();

const ONGKIR_PERCENTAGE    = parseFloat(process.env.ONGKIR_PERCENTAGE)    || 0.05;
const ONGKIR_MINIMUM       = parseInt(process.env.ONGKIR_MINIMUM)         || 5000;
const FEE_LAYANAN_PERCENTAGE = parseFloat(process.env.FEE_LAYANAN_PERCENTAGE) || 0.05;

/**
 * Menghitung ongkir berdasarkan nilai transaksi.
 *
 * Formula: ongkir = MAX(nilai_transaksi × 5%, Rp5.000)
 *
 * @param {number} nilaiTransaksi - Nilai transaksi produk dalam Rupiah
 * @returns {{ ongkir: number, ongkir_raw: number, catatan: string }}
 */
function hitungOngkir(nilaiTransaksi) {
  const ongkirRaw   = Math.floor(nilaiTransaksi * ONGKIR_PERCENTAGE);
  const ongkirFinal = Math.max(ongkirRaw, ONGKIR_MINIMUM);

  let catatan;
  if (ongkirRaw < ONGKIR_MINIMUM) {
    catatan = `${ONGKIR_PERCENTAGE * 100}% dari nilai transaksi (Rp${nilaiTransaksi.toLocaleString('id-ID')} × ${ONGKIR_PERCENTAGE * 100}% = Rp${ongkirRaw.toLocaleString('id-ID')}). Di bawah minimum Rp${ONGKIR_MINIMUM.toLocaleString('id-ID')}, maka digunakan flat minimum.`;
  } else {
    catatan = `${ONGKIR_PERCENTAGE * 100}% dari nilai transaksi (Rp${nilaiTransaksi.toLocaleString('id-ID')} × ${ONGKIR_PERCENTAGE * 100}% = Rp${ongkirFinal.toLocaleString('id-ID')}). Melebihi minimum Rp${ONGKIR_MINIMUM.toLocaleString('id-ID')}, maka digunakan nilai ${ONGKIR_PERCENTAGE * 100}%.`;
  }

  return { ongkir: ongkirFinal, ongkir_raw: ongkirRaw, catatan };
}

/**
 * Menghitung fee layanan LogistiKita dari ongkir.
 *
 * Formula: fee_layanan = FLOOR(ongkir × 5%)
 *
 * @param {number} ongkir - Ongkir final dalam Rupiah
 * @returns {{ fee_layanan: number, basis_ongkir: number, persentase: string }}
 */
function hitungFeeLayanan(ongkir) {
  const fee_layanan = Math.floor(ongkir * FEE_LAYANAN_PERCENTAGE);
  return {
    fee_layanan,
    basis_ongkir: ongkir,
    persentase:   `${FEE_LAYANAN_PERCENTAGE * 100}%`,
    catatan:      `Fee layanan LogistiKita sebesar ${FEE_LAYANAN_PERCENTAGE * 100}% dari ongkir (Rp${ongkir.toLocaleString('id-ID')} × ${FEE_LAYANAN_PERCENTAGE * 100}% = Rp${fee_layanan.toLocaleString('id-ID')})`,
  };
}

/**
 * Menghitung lengkap: ongkir + fee layanan + total biaya.
 *
 * @param {number} nilaiTransaksi
 * @returns {{ ongkir, ongkir_raw, fee_layanan, total_biaya, catatan_ongkir, catatan_fee }}
 */
function hitungSemuaBiaya(nilaiTransaksi) {
  const { ongkir, ongkir_raw, catatan: catatan_ongkir } = hitungOngkir(nilaiTransaksi);
  const { fee_layanan, catatan: catatan_fee }            = hitungFeeLayanan(ongkir);
  const total_biaya = ongkir + fee_layanan;

  return { ongkir, ongkir_raw, fee_layanan, total_biaya, catatan_ongkir, catatan_fee };
}

module.exports = { hitungOngkir, hitungFeeLayanan, hitungSemuaBiaya };
