"use client";
import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import StatCard from '../../../components/admin/StatCard';
import { Wallet, DollarSign, PieChart, TrendingUp, Truck } from 'lucide-react';

export default function AdminKeuangan() {
  const [keuangan, setKeuangan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKeuangan();
  }, []);

  const fetchKeuangan = async () => {
    try {
      const res = await api.get('/admin/keuangan');
      setKeuangan(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="animate-pulse p-8">Memuat data keuangan...</div>;
  if (!keuangan) return <div className="p-8 text-red-500">Gagal memuat keuangan</div>;

  return (
    <div>
      <h1 className="text-display-lg font-bold mb-8">Laporan Keuangan</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Pendapatan" value={`Rp${keuangan.total_pendapatan?.toLocaleString('id-ID')}`} icon={<Wallet size={24} />} colorClass="bg-blue-50 text-blue-600" />
        <StatCard title="Total Ongkir" value={`Rp${keuangan.total_ongkir?.toLocaleString('id-ID')}`} icon={<Truck size={24} />} colorClass="bg-indigo-50 text-indigo-600" />
        <StatCard title="Total Fee Layanan (Untung)" value={`Rp${keuangan.total_fee?.toLocaleString('id-ID')}`} icon={<DollarSign size={24} />} colorClass="bg-green-50 text-green-600" />
        <StatCard title="Rata-rata Ongkir / Paket" value={`Rp${Math.round(keuangan.rata_rata_ongkir || 0).toLocaleString('id-ID')}`} icon={<TrendingUp size={24} />} colorClass="bg-yellow-50 text-yellow-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-canvas p-8 rounded-xl shadow-sm border border-surface-pressed">
           <h2 className="text-display-sm font-bold mb-4">Proporsi Tipe Pengiriman</h2>
           <div className="h-64 flex items-center justify-center text-mute bg-canvas-soft rounded-lg border border-dashed border-surface-pressed">
             [Pie Chart: Reguler vs Nextday vs Sameday]
           </div>
        </div>
        <div className="bg-canvas p-8 rounded-xl shadow-sm border border-surface-pressed">
           <h2 className="text-display-sm font-bold mb-4">Tren Pendapatan Bulanan</h2>
           <div className="h-64 flex items-center justify-center text-mute bg-canvas-soft rounded-lg border border-dashed border-surface-pressed">
             [Area Chart: Revenue]
           </div>
        </div>
      </div>
    </div>
  );
}
