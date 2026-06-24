"use client";
import { useState, useEffect, useMemo } from 'react';
import api from '../../../lib/api';
import ModalCabang from '../../../components/admin/ModalCabang';
import Pagination from '../../../components/ui/Pagination';
import { Search, Edit2 } from 'lucide-react';

export default function AdminCabang() {
  const [cabang, setCabang] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);

  // Search & Pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchCabang();
  }, []);

  const fetchCabang = async () => {
    try {
      const res = await api.get('/admin/cabang');
      setCabang(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data) => {
    try {
      if (editData) {
        await api.put(`/admin/cabang/${editData.id}`, data);
      } else {
        await api.post('/admin/cabang', data);
      }
      setIsModalOpen(false);
      fetchCabang();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Gagal menyimpan cabang');
    }
  };

  const openAddModal = () => {
    setEditData(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditData(item);
    setIsModalOpen(true);
  };

  // Filter and Pagination Logic
  const filteredCabang = useMemo(() => {
    return cabang.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.city.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [cabang, searchQuery]);

  const totalPages = Math.ceil(filteredCabang.length / itemsPerPage);
  const currentData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCabang.slice(start, start + itemsPerPage);
  }, [filteredCabang, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  if (loading) return <div className="animate-pulse p-8">Memuat data cabang...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-display-lg font-bold">Manajemen Cabang</h1>
        <button onClick={openAddModal} className="bg-primary text-on-primary px-4 py-2 rounded-pill font-medium text-button-md hover:bg-opacity-90">Tambah Cabang</button>
      </div>
      
      <div className="bg-canvas rounded-xl shadow-sm border border-surface-pressed overflow-hidden flex flex-col">
        <div className="p-4 border-b border-surface-pressed bg-canvas-soft flex gap-4">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-mute">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Cari cabang atau kota..."
              className="w-full bg-canvas border border-surface-pressed rounded-md pl-10 pr-4 py-2.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-canvas-soft text-body-sm-strong text-mute">
              <tr>
                <th className="px-6 py-4">Nama Cabang</th>
                <th className="px-6 py-4">Kota</th>
                <th className="px-6 py-4">Koordinat</th>
                <th className="px-6 py-4">Urutan Rute</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-pressed text-body-md">
              {currentData.length > 0 ? currentData.map(c => (
                <tr key={c.id} className="hover:bg-canvas-softer">
                  <td className="px-6 py-4 font-bold">{c.name}</td>
                  <td className="px-6 py-4">{c.city}</td>
                  <td className="px-6 py-4 text-mute text-body-sm">{c.latitude}, {c.longitude}</td>
                  <td className="px-6 py-4 text-center">{c.route_order}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${c.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {c.is_active ? 'AKTIF' : 'NONAKTIF'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openEditModal(c)} className="text-primary hover:text-opacity-80 inline-flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-md text-sm font-medium transition-colors">
                      <Edit2 size={16} /> Edit
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-mute">Tidak ada data cabang ditemukan.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      </div>

      <ModalCabang 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSave} 
        initialData={editData} 
      />
    </div>
  );
}
