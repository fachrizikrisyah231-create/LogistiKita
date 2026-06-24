"use client";
import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { Package, Truck, Wallet, Activity } from 'lucide-react';
import StatCard from '../../components/admin/StatCard';
import RevenueChart from '../../components/admin/RevenueChart';
import { formatRupiah } from '../../lib/format';

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
      <div className="mb-8">
        <h1 className="text-display-lg font-bold">Dashboard Overview</h1>
        <p className="text-body-sm text-mute">Ringkasan operasional logistik ekosistem UMKM</p>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Pengiriman" value={data.total_pengiriman || 0} icon={<Package size={24} />} colorClass="text-blue-600 bg-blue-50" />
        <StatCard title="Pengiriman Aktif" value={data.pengiriman_aktif || 0} icon={<Activity size={24} />} colorClass="text-yellow-600 bg-yellow-50" />
        <StatCard title="Total Revenue (Fee)" value={`Rp${formatRupiah(data.total_revenue)}`} icon={<Wallet size={24} />} colorClass="text-green-600 bg-green-50" />
        <StatCard title="Total Kurir" value={data.total_kurir || 0} icon={<Truck size={24} />} colorClass="text-indigo-600 bg-indigo-50" />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-canvas p-6 rounded-xl shadow-sm border border-surface-pressed flex flex-col">
          <h2 className="text-display-sm font-bold mb-4">Tren Pengiriman (7 Hari Terakhir)</h2>
          <div className="h-64 relative flex-1">
            <RevenueChart type="line" data={data.tren_pengiriman} />
          </div>
        </div>
        
        <div className="bg-canvas p-6 rounded-xl shadow-sm border border-surface-pressed flex flex-col">
          <h2 className="text-display-sm font-bold mb-4">Distribusi Status Pengiriman</h2>
          <div className="h-64 relative flex-1">
            <RevenueChart type="donut" data={data.distribusi_status} />
          </div>
        </div>
      </div>
    </div>
  );
}
