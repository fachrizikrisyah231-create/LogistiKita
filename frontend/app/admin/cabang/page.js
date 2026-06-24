"use client";
import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { Search, Plus, Edit2, X, ChevronLeft, ChevronRight } from 'lucide-react';

export default function AdminCabang() {
  const [cabang, setCabang] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search, Filter, Pagination States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    city: '',
    latitude: '',
    longitude: '',
    route_order: '',
    is_active: true
  });
  const [error, setError] = useState('');

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

  // Reset page when search/filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus]);

  // Open Modal
  const openModal = (mode, branch = null) => {
    setModalMode(mode);
    setError('');
    if (mode === 'edit' && branch) {
      setFormData({
        id: branch.id,
        name: branch.name,
        city: branch.city,
        latitude: branch.latitude.toString(),
        longitude: branch.longitude.toString(),
        route_order: branch.route_order.toString(),
        is_active: !!branch.is_active
      });
    } else {
      setFormData({
        id: '',
        name: '',
        city: '',
        latitude: '',
        longitude: '',
        route_order: (cabang.length + 1).toString(),
        is_active: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.city || formData.latitude === '' || formData.longitude === '' || formData.route_order === '') {
      setError('Semua field wajib diisi');
      return;
    }

    const payload = {
      name: formData.name,
      city: formData.city,
      latitude: parseFloat(formData.latitude),
      longitude: parseFloat(formData.longitude),
      route_order: parseInt(formData.route_order),
      is_active: formData.is_active ? 1 : 0
    };

    if (isNaN(payload.latitude) || isNaN(payload.longitude)) {
      setError('Koordinat Latitude & Longitude harus berupa angka desimal');
      return;
    }
    if (isNaN(payload.route_order)) {
      setError('Urutan Rute harus berupa angka bulat');
      return;
    }

    try {
      if (modalMode === 'add') {
        await api.post('/admin/cabang', payload);
      } else {
        await api.put(`/admin/cabang/${formData.id}`, payload);
      }
      fetchCabang();
      setIsModalOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan data cabang');
    }
  };

  // Toggle status directly from table
  const handleToggleStatus = async (branch) => {
    try {
      const payload = {
        name: branch.name,
        city: branch.city,
        latitude: parseFloat(branch.latitude),
        longitude: parseFloat(branch.longitude),
        route_order: parseInt(branch.route_order),
        is_active: branch.is_active ? 0 : 1
      };
      await api.put(`/admin/cabang/${branch.id}`, payload);
      fetchCabang();
    } catch (err) {
      alert('Gagal mengubah status cabang');
    }
  };

  // Filter & Search Logic
  const filteredCabang = cabang.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.city.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' ? true : 
                          filterStatus === 'active' ? c.is_active : !c.is_active;
    return matchesSearch && matchesStatus;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredCabang.length / itemsPerPage) || 1;
  const paginatedCabang = filteredCabang.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading) return <div className="animate-pulse p-8">Memuat data cabang...</div>;

  return (
    <div>
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-display-lg font-bold">Manajemen Cabang</h1>
          <p className="text-body-sm text-mute">Kelola cabang checkpoint transit paket</p>
        </div>
        <button 
          onClick={() => openModal('add')}
          className="bg-primary text-on-primary hover:bg-zinc-800 transition-colors px-5 py-2.5 rounded-pill font-medium text-button-md flex items-center gap-2 self-start md:self-auto"
        >
          <Plus size={18} />
          Tambah Cabang
        </button>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" size={18} />
          <input 
            type="text"
            placeholder="Cari cabang atau kota..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-canvas border border-surface-pressed rounded-md pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-body-md"
          />
        </div>
        <div className="w-full md:w-48">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full bg-canvas border border-surface-pressed rounded-md px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary text-body-md font-medium"
          >
            <option value="all">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>
        </div>
      </div>
      
      {/* Table Card */}
      <div className="bg-canvas rounded-xl shadow-sm border border-surface-pressed overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-canvas-soft text-body-sm-strong text-mute">
              <tr>
                <th className="px-6 py-4">Urutan Rute</th>
                <th className="px-6 py-4">Nama Cabang</th>
                <th className="px-6 py-4">Kota</th>
                <th className="px-6 py-4">Koordinat</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-pressed text-body-md">
              {paginatedCabang.map(c => (
                <tr key={c.id} className="hover:bg-canvas-softer transition-colors">
                  <td className="px-6 py-4 font-bold text-primary">{c.route_order}</td>
                  <td className="px-6 py-4 font-bold">{c.name}</td>
                  <td className="px-6 py-4">{c.city}</td>
                  <td className="px-6 py-4 text-mute text-body-sm">{c.latitude}, {c.longitude}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggleStatus(c)}
                      className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                        c.is_active 
                          ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      }`}
                    >
                      {c.is_active ? 'AKTIF' : 'NONAKTIF'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => openModal('edit', c)}
                      className="p-2 text-mute hover:text-ink hover:bg-canvas-soft rounded transition-colors inline-flex items-center gap-1.5 text-body-sm font-medium"
                      title="Edit Cabang"
                    >
                      <Edit2 size={16} />
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {paginatedCabang.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-mute">
                    Tidak ada cabang yang ditemukan
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
                {Math.min(currentPage * itemsPerPage, filteredCabang.length)}
              </span>{' '}
              dari <span className="font-medium text-ink">{filteredCabang.length}</span> cabang
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

      {/* CRUD Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-canvas rounded-xl shadow-lg border border-surface-pressed max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center px-6 py-4 border-b border-surface-pressed">
              <h2 className="text-display-sm font-bold">
                {modalMode === 'add' ? 'Tambah Cabang Baru' : 'Edit Data Cabang'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-mute hover:text-ink p-1 rounded hover:bg-canvas-soft transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              {error && (
                <div className="bg-red-50 text-red-700 text-body-sm-strong border border-red-200 rounded-md p-3 mb-4">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-body-sm-strong text-mute mb-1">Nama Cabang</label>
                  <input 
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Contoh: Cabang Jakarta"
                    className="w-full bg-canvas border border-surface-pressed rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-body-md"
                  />
                </div>

                <div>
                  <label className="block text-body-sm-strong text-mute mb-1">Kota</label>
                  <input 
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    placeholder="Contoh: Jakarta"
                    className="w-full bg-canvas border border-surface-pressed rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-body-md"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-body-sm-strong text-mute mb-1">Latitude</label>
                    <input 
                      type="text"
                      required
                      value={formData.latitude}
                      onChange={(e) => setFormData({...formData, latitude: e.target.value})}
                      placeholder="-6.2088"
                      className="w-full bg-canvas border border-surface-pressed rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-body-md"
                    />
                  </div>
                  <div>
                    <label className="block text-body-sm-strong text-mute mb-1">Longitude</label>
                    <input 
                      type="text"
                      required
                      value={formData.longitude}
                      onChange={(e) => setFormData({...formData, longitude: e.target.value})}
                      placeholder="106.8456"
                      className="w-full bg-canvas border border-surface-pressed rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-body-md"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-body-sm-strong text-mute mb-1">Urutan Rute</label>
                  <input 
                    type="number"
                    required
                    value={formData.route_order}
                    onChange={(e) => setFormData({...formData, route_order: e.target.value})}
                    placeholder="1"
                    min="1"
                    className="w-full bg-canvas border border-surface-pressed rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-body-md"
                  />
                </div>

                <div className="flex items-center gap-2.5 py-2">
                  <input 
                    type="checkbox"
                    id="modal_is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                    className="w-4 h-4 rounded border-surface-pressed text-primary focus:ring-primary cursor-pointer"
                  />
                  <label htmlFor="modal_is_active" className="text-body-md font-medium cursor-pointer">
                    Cabang Aktif (Dapat digunakan untuk rute transit)
                  </label>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-surface-pressed pt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-surface-pressed text-body rounded-md font-medium hover:bg-canvas-soft transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-primary text-on-primary rounded-md font-medium hover:bg-zinc-800 transition-colors"
                >
                  {modalMode === 'add' ? 'Tambah Cabang' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
