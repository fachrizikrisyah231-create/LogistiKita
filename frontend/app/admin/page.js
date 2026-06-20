"use client";
import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { Package, Truck, Wallet, Activity } from 'lucide-react';
import StatCard from '../../components/admin/StatCard';

export default function AdminOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOverview();
  }, []);

  const fetchOverview = async () => {
    try {
      const res = await api.get('/admin/overview');
      setData(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-body-md text-mute animate-pulse p-8">Memuat data...</div>;
  if (!data) return <div className="text-red-500 p-8">Gagal memuat data overview</div>;

  return (
    <div>
      <h1 className="text-display-lg font-bold mb-8">Dashboard Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Pengiriman" value={data.total_pengiriman || 0} icon={<Package size={24} />} colorClass="text-blue-600 bg-blue-50" />
        <StatCard title="Pengiriman Aktif" value={data.pengiriman_aktif || 0} icon={<Activity size={24} />} colorClass="text-yellow-600 bg-yellow-50" />
        <StatCard title="Total Revenue" value={`Rp${(data.total_revenue || 0).toLocaleString('id-ID')}`} icon={<Wallet size={24} />} colorClass="text-green-600 bg-green-50" />
        <StatCard title="Total Kurir" value={data.total_kurir || 0} icon={<Truck size={24} />} colorClass="text-indigo-600 bg-indigo-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-canvas p-8 rounded-xl shadow-sm border border-surface-pressed">
           <h2 className="text-display-sm font-bold mb-4">Tren Pengiriman (7 Hari)</h2>
           <div className="h-64 flex items-center justify-center text-mute bg-canvas-soft rounded-lg border border-dashed border-surface-pressed">
             [Chart Line placeholder]
           </div>
        </div>
        <div className="bg-canvas p-8 rounded-xl shadow-sm border border-surface-pressed">
           <h2 className="text-display-sm font-bold mb-4">Status Pengiriman</h2>
           <div className="h-64 flex items-center justify-center text-mute bg-canvas-soft rounded-lg border border-dashed border-surface-pressed">
             [Chart Donut placeholder]
           </div>
        </div>
      </div>
    </div>
  );
}
