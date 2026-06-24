"use client";
import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import StatCard from '../../../components/admin/StatCard';
import { Wallet, DollarSign, PieChart as PieChartIcon, TrendingUp, Truck } from 'lucide-react';
import { PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

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
           <div className="h-64">
             {keuangan.tipe_pengiriman && keuangan.tipe_pengiriman.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie
                     data={keuangan.tipe_pengiriman}
                     cx="50%"
                     cy="50%"
                     innerRadius={60}
                     outerRadius={80}
                     fill="#8884d8"
                     paddingAngle={5}
                     dataKey="value"
                     label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                   >
                     {keuangan.tipe_pengiriman.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                     ))}
                   </Pie>
                   <Tooltip />
                 </PieChart>
               </ResponsiveContainer>
             ) : (
               <div className="h-full flex items-center justify-center text-mute bg-canvas-soft rounded-lg border border-dashed border-surface-pressed">Belum ada data</div>
             )}
           </div>
        </div>
        <div className="bg-canvas p-8 rounded-xl shadow-sm border border-surface-pressed">
           <h2 className="text-display-sm font-bold mb-4">Tren Pendapatan (Fee Layanan)</h2>
           <div className="h-64">
             {keuangan.revenue_bulanan && keuangan.revenue_bulanan.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={keuangan.revenue_bulanan}>
                   <defs>
                     <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="#0088FE" stopOpacity={0.8}/>
                       <stop offset="95%" stopColor="#0088FE" stopOpacity={0}/>
                     </linearGradient>
                   </defs>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} />
                   <XAxis dataKey="name" />
                   <YAxis tickFormatter={(val) => `Rp${val / 1000}k`} />
                   <Tooltip formatter={(value) => `Rp${value.toLocaleString('id-ID')}`} />
                   <Area type="monotone" dataKey="revenue" stroke="#0088FE" fillOpacity={1} fill="url(#colorRevenue)" />
                 </AreaChart>
               </ResponsiveContainer>
             ) : (
               <div className="h-full flex items-center justify-center text-mute bg-canvas-soft rounded-lg border border-dashed border-surface-pressed">Belum ada data</div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
}
