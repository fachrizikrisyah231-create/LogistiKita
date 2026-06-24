"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';
import AuthGuard from '../../../components/AuthGuard';
import MapPickerWrapper from '../../../components/MapPickerWrapper';
import AddressAutocomplete from '../../../components/AddressAutocomplete';

export default function BuatPengiriman() {
  const router = useRouter();
  
  const [form, setForm] = useState({
    alamat_asal: '', lat_asal: '', lng_asal: '',
    alamat_tujuan: '', lat_tujuan: '', lng_tujuan: '',
    tipe_pengiriman: 'reguler'
  });
  
  const [estimasi, setEstimasi] = useState(null);
  const [loadingEst, setLoadingEst] = useState(false);
  const [errorEst, setErrorEst] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Debounce hitung estimasi
  useEffect(() => {
    const { lat_asal, lng_asal, lat_tujuan, lng_tujuan, tipe_pengiriman } = form;
    if (lat_asal && lng_asal && lat_tujuan && lng_tujuan) {
      const timer = setTimeout(() => {
        hitungEstimasi();
      }, 800);
      return () => clearTimeout(timer);
    } else {
      setEstimasi(null);
      setErrorEst('');
    }
  }, [form.lat_asal, form.lng_asal, form.lat_tujuan, form.lng_tujuan, form.tipe_pengiriman]);

  const reverseGeocode = async (lat, lng, type) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      if (data && data.display_name) {
        setForm(prev => ({ ...prev, [type === 'asal' ? 'alamat_asal' : 'alamat_tujuan']: data.display_name }));
      }
    } catch (err) {
      console.error("Reverse geocoding error:", err);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const hitungEstimasi = async () => {
    setLoadingEst(true);
    setErrorEst('');
    try {
      const { lat_asal, lng_asal, lat_tujuan, lng_tujuan, tipe_pengiriman } = form;
      // Langkah 1: Hitung Ongkir
      const resBiaya = await api.post('/biaya_pengiriman', {
        lat_asal: parseFloat(lat_asal),
        lng_asal: parseFloat(lng_asal),
        lat_tujuan: parseFloat(lat_tujuan),
        lng_tujuan: parseFloat(lng_tujuan),
        tipe_pengiriman
      });
      const ongkirData = resBiaya.data.data;
      
      // Langkah 2: Hitung Fee
      const resFee = await api.post('/biaya_layanan_logistik', {
        ongkir: ongkirData.ongkir
      });
      const feeData = resFee.data.data;

      setEstimasi({
        jarak_km: ongkirData.jarak_km,
        tipe_pengiriman: ongkirData.tipe_pengiriman,
        ongkir: ongkirData.ongkir,
        fee_layanan: feeData.fee_layanan,
        total_biaya: ongkirData.ongkir + feeData.fee_layanan
      });
    } catch (err) {
      setEstimasi(null);
      setErrorEst(err.response?.data?.error?.message || 'Gagal menghitung estimasi');
    } finally {
      setLoadingEst(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!estimasi || errorEst) return alert('Silakan lengkapi data dengan benar dan tunggu estimasi.');
    
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        lat_asal: parseFloat(form.lat_asal),
        lng_asal: parseFloat(form.lng_asal),
        lat_tujuan: parseFloat(form.lat_tujuan),
        lng_tujuan: parseFloat(form.lng_tujuan),
        nilai_transaksi: 10000 // default dummy
      };
      // Langkah 1: Buat Pengiriman (Status PENDING)
      const resShipment = await api.post('/shipments/direct', payload);
      const shipmentData = resShipment.data.data;
      
      // Langkah 2: Bayar (Lempar tagihan ke SmartBank)
      await api.post('/pembayaran_logistik', {
        shipment_id: shipmentData.shipment_id,
        order_id: shipmentData.order_id,
        user_id: payload.user_id || 'usr-temp', // Backend middleware akan handle user_id dari JWT
        ongkir: shipmentData.biaya.ongkir,
        fee_layanan: shipmentData.biaya.fee_layanan,
        total_biaya: shipmentData.biaya.total_biaya
      });

      alert('Pengiriman berhasil dibayar dan akan segera diproses!');
      router.push('/customer');
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Gagal membuat/membayar pengiriman');
    } finally {
      setSubmitting(false);
    }
  };

  const dummyAsal = () => setForm({ ...form, alamat_asal: 'Jl. Merdeka Bandung', lat_asal: '-6.9175', lng_asal: '107.6191' });
  const dummyTujuan = () => setForm({ ...form, alamat_tujuan: 'Jl. Pemuda Semarang', lat_tujuan: '-6.9666', lng_tujuan: '110.4196' });

  return (
    <AuthGuard allowedRoles={['customer', 'admin']}>
      <div className="max-w-[1280px] mx-auto px-6 md:px-12 py-12">
        <h1 className="text-display-lg font-bold mb-8">Buat Pengiriman Baru</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-canvas rounded-xl shadow-md border border-surface-pressed p-6 md:p-8 space-y-8">
              
              {/* ASAL */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-display-sm font-bold">1. Lokasi Pengambilan</h2>
                  <button type="button" onClick={dummyAsal} className="text-body-sm text-link underline">Isi Dummy Bandung</button>
                </div>
                <div className="space-y-4">
                  <AddressAutocomplete 
                    value={form.alamat_asal}
                    onChange={(val) => setForm(prev => ({ ...prev, alamat_asal: val }))}
                    onSelectLocation={(pos) => setForm(prev => ({ ...prev, lat_asal: pos.lat, lng_asal: pos.lng }))}
                    placeholder="Alamat lengkap asal"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <input type="number" step="any" name="lat_asal" placeholder="Latitude asal" required readOnly
                      className="bg-canvas-soft rounded-md p-4 text-body-md focus:outline-none focus:ring-2 focus:ring-primary cursor-not-allowed opacity-70"
                      value={form.lat_asal} onChange={handleChange} />
                    <input type="number" step="any" name="lng_asal" placeholder="Longitude asal" required readOnly
                      className="bg-canvas-soft rounded-md p-4 text-body-md focus:outline-none focus:ring-2 focus:ring-primary cursor-not-allowed opacity-70"
                      value={form.lng_asal} onChange={handleChange} />
                  </div>
                  <div className="mt-2">
                    <p className="text-body-sm text-mute mb-2">Pilih lokasi di peta:</p>
                    <MapPickerWrapper 
                      position={form.lat_asal && form.lng_asal ? { lat: parseFloat(form.lat_asal), lng: parseFloat(form.lng_asal) } : null}
                      onChange={(pos) => {
                        setForm(prev => ({ ...prev, lat_asal: pos.lat, lng_asal: pos.lng }));
                        reverseGeocode(pos.lat, pos.lng, 'asal');
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="h-px bg-surface-pressed w-full"></div>

              {/* TUJUAN */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-display-sm font-bold">2. Lokasi Tujuan</h2>
                  <button type="button" onClick={dummyTujuan} className="text-body-sm text-link underline">Isi Dummy Semarang</button>
                </div>
                <div className="space-y-4">
                  <AddressAutocomplete 
                    value={form.alamat_tujuan}
                    onChange={(val) => setForm(prev => ({ ...prev, alamat_tujuan: val }))}
                    onSelectLocation={(pos) => setForm(prev => ({ ...prev, lat_tujuan: pos.lat, lng_tujuan: pos.lng }))}
                    placeholder="Alamat lengkap tujuan"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <input type="number" step="any" name="lat_tujuan" placeholder="Latitude tujuan" required readOnly
                      className="bg-canvas-soft rounded-md p-4 text-body-md focus:outline-none focus:ring-2 focus:ring-primary cursor-not-allowed opacity-70"
                      value={form.lat_tujuan} onChange={handleChange} />
                    <input type="number" step="any" name="lng_tujuan" placeholder="Longitude tujuan" required readOnly
                      className="bg-canvas-soft rounded-md p-4 text-body-md focus:outline-none focus:ring-2 focus:ring-primary cursor-not-allowed opacity-70"
                      value={form.lng_tujuan} onChange={handleChange} />
                  </div>
                  <div className="mt-2">
                    <p className="text-body-sm text-mute mb-2">Pilih lokasi di peta:</p>
                    <MapPickerWrapper 
                      position={form.lat_tujuan && form.lng_tujuan ? { lat: parseFloat(form.lat_tujuan), lng: parseFloat(form.lng_tujuan) } : null}
                      onChange={(pos) => {
                        setForm(prev => ({ ...prev, lat_tujuan: pos.lat, lng_tujuan: pos.lng }));
                        reverseGeocode(pos.lat, pos.lng, 'tujuan');
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="h-px bg-surface-pressed w-full"></div>

              {/* TIPE PENGIRIMAN */}
              <div>
                <h2 className="text-display-sm font-bold mb-4">3. Tipe Pengiriman</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {['reguler', 'nextday', 'sameday'].map(tipe => (
                    <label key={tipe} className={`border rounded-xl p-4 cursor-pointer transition-colors ${form.tipe_pengiriman === tipe ? 'border-primary ring-1 ring-primary bg-canvas-softer' : 'border-surface-pressed hover:bg-canvas-soft'}`}>
                      <input 
                        type="radio" name="tipe_pengiriman" value={tipe} 
                        checked={form.tipe_pengiriman === tipe} onChange={handleChange} 
                        className="sr-only" 
                      />
                      <div className="font-bold text-body-lg capitalize">{tipe}</div>
                      <div className="text-body-sm text-body mt-1">
                        {tipe === 'reguler' && 'Tiba dalam 2-3 hari'}
                        {tipe === 'nextday' && 'Tiba esok hari (Maks 250km)'}
                        {tipe === 'sameday' && 'Tiba hari ini (Maks 50km)'}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

            </form>
          </div>

          {/* SIDEBAR ESTIMASI */}
          <div className="lg:col-span-1">
            <div className="bg-canvas-soft rounded-xl p-6 md:p-8 sticky top-24">
              <h3 className="text-display-md font-bold mb-6">Estimasi Biaya</h3>
              
              {!form.lat_asal || !form.lat_tujuan ? (
                <div className="text-body-md text-mute text-center py-8">Isi koordinat asal dan tujuan untuk melihat estimasi</div>
              ) : errorEst ? (
                <div className="text-body-md text-red-600 bg-red-50 p-4 rounded-md">{errorEst}</div>
              ) : estimasi ? (
                <div className={`space-y-4 transition-opacity duration-300 ${loadingEst ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                  <div className="flex justify-between items-center text-body-md">
                    <span className="text-body">Jarak Tempuh</span>
                    <span className="font-medium">{estimasi.jarak_km.toFixed(1)} km</span>
                  </div>
                  <div className="flex justify-between items-center text-body-md">
                    <span className="text-body">Ongkos Kirim</span>
                    <span className="font-medium">Rp{estimasi.ongkir.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between items-center text-body-md">
                    <span className="text-body">Fee Layanan (5%)</span>
                    <span className="font-medium">Rp{estimasi.fee_layanan.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="h-px bg-surface-pressed w-full my-4"></div>
                  <div className="flex justify-between items-center text-display-sm font-bold">
                    <span>Total</span>
                    <span>Rp{estimasi.total_biaya.toLocaleString('id-ID')}</span>
                  </div>
                  
                  <div className="mt-8 pt-6 border-t border-surface-pressed">
                    <button 
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="w-full bg-primary text-on-primary font-medium text-button-large rounded-xl px-6 py-4 hover:bg-black-elevated transition-colors disabled:opacity-50"
                    >
                      {submitting ? 'Memproses...' : 'Kirim Paket Sekarang'}
                    </button>
                  </div>
                </div>
              ) : loadingEst ? (
                <div className="text-body-md text-ink text-center py-8">Menghitung...</div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
