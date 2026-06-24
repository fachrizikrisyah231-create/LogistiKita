"use client";
import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatRupiah } from '../../../lib/format';

export default function AdminPengiriman() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [kurirList, setKurirList] = useState([]);

  // Search, Filter, Pagination States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resShip, resKur] = await Promise.all([
        api.get('/admin/shipments'),
        api.get('/admin/kurir')
      ]);
      setShipments(resShip.data.data);
      setKurirList(resKur.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const STATUSES = ["PENDING", "PICKUP", "IN_TRANSIT", "AT_BRANCH", "OUT_FOR_DELIVERY", "DELIVERED", "FAILED"];

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.put(`/admin/shipments/${id}/status`, { status });
      fetchData();
    } catch (err) {
      alert('Gagal ubah status');
    }
  };

  const handleAssignKurir = async (id, kurir_id) => {
    if (!kurir_id) return;
    try {
      await api.put(`/admin/shipments/${id}/assign-kurir`, { kurir_id });
      fetchData();
      alert('Kurir berhasil di-assign');
    } catch (err) {
      alert('Gagal assign kurir');
    }
  };

  // Reset page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, filterType]);

  // Search & Filter Logic
  const filteredShipments = shipments.filter(s => {
    const matchesSearch = s.order_id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (s.alamat_asal && s.alamat_asal.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (s.alamat_tujuan && s.alamat_tujuan.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = filterStatus === 'all' ? true : s.status === filterStatus;
    const matchesType = filterType === 'all' ? true : s.tipe_pengiriman === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredShipments.length / itemsPerPage) || 1;
  const paginatedShipments = filteredShipments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading) return <div className="animate-pulse p-8">Memuat data pengiriman...</div>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-display-lg font-bold">Manajemen Pengiriman</h1>
        <p className="text-body-sm text-mute">Pantau dan kelola seluruh status paket pengiriman ekosistem</p>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" size={18} />
          <input 
            type="text"
            placeholder="Cari berdasarkan Order ID, alamat asal, atau alamat tujuan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-canvas border border-surface-pressed rounded-md pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-body-md"
          />
        </div>
        <div className="flex gap-4">
          <div className="w-40">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-canvas border border-surface-pressed rounded-md px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary text-body-md font-medium"
            >
              <option value="all">Semua Status</option>
              {STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
            </select>
          </div>
          <div className="w-40">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full bg-canvas border border-surface-pressed rounded-md px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary text-body-md font-medium capitalize"
            >
              <option value="all">Semua Layanan</option>
              <option value="reguler">Reguler</option>
              <option value="nextday">Nextday</option>
              <option value="sameday">Sameday</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Table Card */}
      <div className="bg-canvas rounded-xl shadow-sm border border-surface-pressed overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-canvas-soft text-body-sm-strong text-mute">
              <tr>
                <th className="px-6 py-4">Order / Tanggal</th>
                <th className="px-6 py-4">Asal & Tujuan</th>
                <th className="px-6 py-4">Biaya</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Kurir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-pressed text-body-md">
              {paginatedShipments.map(s => (
                <tr key={s.id} className="hover:bg-canvas-softer transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold">{s.order_id}</div>
                    <div className="text-body-sm text-mute">{new Date(s.created_at).toLocaleDateString('id-ID')}</div>
                    <div className="text-body-sm-strong bg-canvas-soft border border-surface-pressed inline-block px-2 py-0.5 rounded mt-1 capitalize text-xs">
                      {s.tipe_pengiriman}
                    </div>
                  </td>
                  <td className="px-6 py-4 max-w-xs">
                    <div className="truncate mb-1 text-body-sm" title={s.alamat_asal}><span className="font-medium text-mute">Dari:</span> {s.alamat_asal}</div>
                    <div className="truncate text-body-sm" title={s.alamat_tujuan}><span className="font-medium text-mute">Ke:</span> {s.alamat_tujuan}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-ink">Rp{formatRupiah(s.total_biaya)}</div>
                    <div className="text-body-xs text-mute font-medium">{s.jarak_km} km</div>
                  </td>
                  <td className="px-6 py-4">
                    <select 
                      value={s.status}
                      onChange={(e) => handleUpdateStatus(s.id, e.target.value)}
                      className="bg-canvas border border-surface-pressed rounded px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary font-semibold text-zinc-800"
                    >
                      {STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <select 
                      value={s.assigned_kurir_id || ''}
                      onChange={(e) => handleAssignKurir(s.id, e.target.value)}
                      className="bg-canvas border border-surface-pressed rounded px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary w-full max-w-[170px]"
                    >
                      <option value="">-- Assign Kurir --</option>
                      {kurirList.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
              {paginatedShipments.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-mute">Tidak ada data pengiriman</td>
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
                {Math.min(currentPage * itemsPerPage, filteredShipments.length)}
              </span>{' '}
              dari <span className="font-medium text-ink">{filteredShipments.length}</span> pengiriman
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
  );
}
