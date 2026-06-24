"use client";
import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

export default function AdminKurir() {
  const [kurir, setKurir] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search, Filter, Pagination States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBranch, setFilterBranch] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resKurir, resBranches] = await Promise.all([
        api.get('/admin/kurir'),
        api.get('/admin/cabang')
      ]);
      setKurir(resKurir.data.data);
      setBranches(resBranches.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Reset page when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterBranch]);

  // Search & Filter Logic
  const filteredKurir = kurir.filter(k => {
    const matchesSearch = k.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          k.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    // k.branch_id matches filterBranch (or 'all')
    const matchesBranch = filterBranch === 'all' ? true : 
                          filterBranch === 'unassigned' ? !k.branch_id : 
                          k.branch_id === filterBranch;
    return matchesSearch && matchesBranch;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredKurir.length / itemsPerPage) || 1;
  const paginatedKurir = filteredKurir.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading) return <div className="animate-pulse p-8">Memuat data kurir...</div>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-display-lg font-bold">Manajemen Kurir</h1>
        <p className="text-body-sm text-mute">Pantau daftar kurir, penugasan cabang, dan performa penyelesaian tugas</p>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" size={18} />
          <input 
            type="text"
            placeholder="Cari berdasarkan nama atau email kurir..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-canvas border border-surface-pressed rounded-md pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-body-md"
          />
        </div>
        <div className="w-full md:w-56">
          <select
            value={filterBranch}
            onChange={(e) => setFilterBranch(e.target.value)}
            className="w-full bg-canvas border border-surface-pressed rounded-md px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary text-body-md font-medium"
          >
            <option value="all">Semua Cabang Tugas</option>
            <option value="unassigned">Tanpa Cabang (Semua)</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Table Card */}
      <div className="bg-canvas rounded-xl shadow-sm border border-surface-pressed overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-canvas-soft text-body-sm-strong text-mute">
            <tr>
              <th className="px-6 py-4">Nama Kurir</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Cabang Bertugas</th>
              <th className="px-6 py-4">Total Tugas Aktif</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-pressed text-body-md">
            {paginatedKurir.map(k => (
              <tr key={k.id} className="hover:bg-canvas-softer transition-colors">
                <td className="px-6 py-4 font-bold text-ink">{k.name}</td>
                <td className="px-6 py-4 text-body-md">{k.email}</td>
                <td className="px-6 py-4 text-mute text-body-sm">
                  {k.branch_name || 'Semua Cabang (Pusat)'}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded text-xs font-bold ${
                    k.tugas_aktif > 0 
                      ? 'bg-amber-100 text-amber-800' 
                      : 'bg-zinc-100 text-zinc-600'
                  }`}>
                    {k.tugas_aktif || 0} Paket Aktif
                  </span>
                </td>
              </tr>
            ))}
            {paginatedKurir.length === 0 && (
              <tr>
                <td colSpan="4" className="px-6 py-12 text-center text-mute">
                  Tidak ada kurir yang ditemukan
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="bg-canvas-soft border-t border-surface-pressed px-6 py-4 flex items-center justify-between">
            <p className="text-body-sm text-mute">
              Menampilkan <span className="font-medium text-ink">{((currentPage - 1) * itemsPerPage) + 1}</span> hingga{' '}
              <span className="font-medium text-ink">
                {Math.min(currentPage * itemsPerPage, filteredKurir.length)}
              </span>{' '}
              dari <span className="font-medium text-ink">{filteredKurir.length}</span> kurir
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
