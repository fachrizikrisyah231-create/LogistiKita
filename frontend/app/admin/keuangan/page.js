"use client";
import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import StatCard from '../../../components/admin/StatCard';
import RevenueChart from '../../../components/admin/RevenueChart';
import { Wallet, DollarSign, TrendingUp, Truck, Search, ChevronLeft, ChevronRight } from 'lucide-react';

export default function AdminKeuangan() {
  const [keuangan, setKeuangan] = useState(null);
  const [loading, setLoading] = useState(true);

  // Chart range toggle: '7' | '30'
  const [chartRange, setChartRange] = useState('30');

  // Table Search, Filter, Pagination States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  // Reset page when search/filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus]);

  if (loading) return <div className="animate-pulse p-8">Memuat data keuangan...</div>;
  if (!keuangan) return <div className="p-8 text-red-500">Gagal memuat keuangan</div>;

  // Donut Chart Data mapping: stats_by_type -> { name, value }
  const pieData = keuangan.stats_by_type?.map(item => ({
    name: item.tipe_pengiriman.toUpperCase(),
    value: parseFloat(item.total_revenue || 0)
  })) || [];

  // Area Chart Data mapping with range filter
  const areaData = chartRange === '7' 
    ? keuangan.daily_revenue?.slice(-7) 
    : keuangan.daily_revenue || [];

  // Table Search & Filter Logic
  const filteredTransactions = (keuangan.transactions || []).filter(t => {
    const matchesSearch = t.order_id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (t.transaction_id && t.transaction_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          t.id.toString().includes(searchQuery);
    const matchesStatus = filterStatus === 'all' ? true : t.payment_status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Table Pagination Logic
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage) || 1;
  const paginatedTransactions = filteredTransactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-display-lg font-bold">Laporan Keuangan</h1>
        <p className="text-body-sm text-mute">Pantau ringkasan pendapatan, ongkir logistik, dan transaksi pembayaran</p>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Pendapatan" value={`Rp${keuangan.total_pendapatan?.toLocaleString('id-ID')}`} icon={<Wallet size={24} />} colorClass="bg-blue-50 text-blue-600" />
        <StatCard title="Total Ongkir" value={`Rp${keuangan.total_ongkir?.toLocaleString('id-ID')}`} icon={<Truck size={24} />} colorClass="bg-indigo-50 text-indigo-600" />
        <StatCard title="Total Fee Layanan (Untung)" value={`Rp${keuangan.total_fee?.toLocaleString('id-ID')}`} icon={<DollarSign size={24} />} colorClass="bg-green-50 text-green-600" />
        <StatCard title="Rata-rata Ongkir / Paket" value={`Rp${Math.round(keuangan.rata_rata_ongkir || 0).toLocaleString('id-ID')}`} icon={<TrendingUp size={24} />} colorClass="bg-yellow-50 text-yellow-600" />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-canvas p-6 rounded-xl shadow-sm border border-surface-pressed flex flex-col">
          <h2 className="text-display-sm font-bold mb-4">Proporsi Pendapatan Tipe Layanan</h2>
          <div className="h-64 relative flex-1">
            <RevenueChart type="donut" data={pieData} />
          </div>
        </div>

        <div className="bg-canvas p-6 rounded-xl shadow-sm border border-surface-pressed flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-display-sm font-bold">Tren Pendapatan Harian</h2>
            <div className="flex bg-canvas-soft p-1 rounded-md border border-surface-pressed">
              <button 
                onClick={() => setChartRange('7')}
                className={`px-3 py-1 text-xs font-semibold rounded transition-all ${chartRange === '7' ? 'bg-canvas shadow-sm text-ink' : 'text-mute hover:text-ink'}`}
              >
                7 Hari
              </button>
              <button 
                onClick={() => setChartRange('30')}
                className={`px-3 py-1 text-xs font-semibold rounded transition-all ${chartRange === '30' ? 'bg-canvas shadow-sm text-ink' : 'text-mute hover:text-ink'}`}
              >
                30 Hari
              </button>
            </div>
          </div>
          <div className="h-64 relative flex-1">
            <RevenueChart type="area" data={areaData} />
          </div>
        </div>
      </div>

      {/* Daftar Transaksi Table Card */}
      <div className="mb-6">
        <h2 className="text-display-sm font-bold mb-4">Daftar Transaksi Terakhir</h2>
        
        {/* Table Search & Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" size={18} />
            <input 
              type="text"
              placeholder="Cari transaksi berdasarkan Order ID atau Transaction ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-canvas border border-surface-pressed rounded-md pl-10 pr-4 py-2 outline-none focus:ring-2 focus:ring-primary text-body-md"
            />
          </div>
          <div className="w-full md:w-48">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-canvas border border-surface-pressed rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-body-md font-medium"
            >
              <option value="all">Semua Status</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="FAILED">FAILED</option>
              <option value="PENDING">PENDING</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="bg-canvas rounded-xl shadow-sm border border-surface-pressed overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-canvas-soft text-body-sm-strong text-mute">
                <tr>
                  <th className="px-6 py-4">ID Transaksi</th>
                  <th className="px-6 py-4">Order ID</th>
                  <th className="px-6 py-4">Total Billed</th>
                  <th className="px-6 py-4">Breakdown</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Tanggal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-pressed text-body-md">
                {paginatedTransactions.map(t => (
                  <tr key={t.id} className="hover:bg-canvas-softer transition-colors">
                    <td className="px-6 py-4 text-mute text-body-sm max-w-[120px] truncate" title={t.transaction_id || t.id}>
                      {t.transaction_id || `TX-${t.id}`}
                    </td>
                    <td className="px-6 py-4 font-bold">{t.order_id}</td>
                    <td className="px-6 py-4 font-bold text-ink">
                      Rp{t.amount?.toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 text-body-sm text-mute">
                      <div>Ongkir: Rp{t.ongkir?.toLocaleString('id-ID')}</div>
                      <div>Fee (5%): Rp{t.fee_layanan?.toLocaleString('id-ID')}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded text-xs font-bold ${
                        t.payment_status === 'SUCCESS' 
                          ? 'bg-green-100 text-green-800' 
                          : t.payment_status === 'FAILED' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {t.payment_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-mute text-body-sm">
                      {new Date(t.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
                {paginatedTransactions.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-mute">
                      Tidak ada transaksi yang ditemukan
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="bg-canvas-soft border-t border-surface-pressed px-6 py-4 flex items-center justify-between">
              <p className="text-body-sm text-mute">
                Menampilkan <span className="font-medium text-ink">{((currentPage - 1) * itemsPerPage) + 1}</span> hingga{' '}
                <span className="font-medium text-ink">
                  {Math.min(currentPage * itemsPerPage, filteredTransactions.length)}
                </span>{' '}
                dari <span className="font-medium text-ink">{filteredTransactions.length}</span> transaksi
              </p>
              <div className="flex gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="p-2 border border-surface-pressed bg-canvas hover:bg-canvas-softer disabled:opacity-50 disabled:hover:bg-canvas rounded transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="p-2 border border-surface-pressed bg-canvas hover:bg-canvas-softer disabled:opacity-50 disabled:hover:bg-canvas rounded transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
