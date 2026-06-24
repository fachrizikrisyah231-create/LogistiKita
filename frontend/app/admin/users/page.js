"use client";
import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { Search, Plus, Edit2, X, ChevronLeft, ChevronRight, UserPlus } from 'lucide-react';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search, Filter, Pagination States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    email: '',
    password: '',
    role: 'customer',
    branch_id: '',
    is_active: true
  });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resUsers, resBranches] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/cabang')
      ]);
      setUsers(resUsers.data.data);
      setBranches(resBranches.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Reset page when search/filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterRole, filterStatus]);

  // Open Modal
  const openModal = (mode, user = null) => {
    setModalMode(mode);
    setError('');
    if (mode === 'edit' && user) {
      setFormData({
        id: user.id,
        name: user.name,
        email: user.email,
        password: '', // Do not load password for editing
        role: user.role,
        branch_id: user.branch_id || '',
        is_active: !!user.is_active
      });
    } else {
      setFormData({
        id: '',
        name: '',
        email: '',
        password: '',
        role: 'customer',
        branch_id: '',
        is_active: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.email) {
      setError('Nama dan Email wajib diisi');
      return;
    }

    if (modalMode === 'add' && !formData.password) {
      setError('Password wajib diisi untuk user baru');
      return;
    }

    const payload = {
      name: formData.name,
      email: formData.email,
      role: formData.role,
      branch_id: formData.role === 'kurir' && formData.branch_id ? formData.branch_id : null,
      is_active: formData.is_active ? 1 : 0
    };

    if (modalMode === 'add') {
      payload.password = formData.password;
    }

    try {
      if (modalMode === 'add') {
        await api.post('/admin/users', payload);
      } else {
        await api.put(`/admin/users/${formData.id}`, payload);
      }
      fetchData();
      setIsModalOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan data user');
    }
  };

  // Toggle active status directly
  const handleToggleStatus = async (user) => {
    try {
      const payload = {
        is_active: user.is_active ? 0 : 1
      };
      await api.put(`/admin/users/${user.id}`, payload);
      fetchData();
    } catch (err) {
      alert('Gagal mengubah status user');
    }
  };

  // Filter & Search Logic
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' ? true : u.role === filterRole;
    const matchesStatus = filterStatus === 'all' ? true : 
                          filterStatus === 'active' ? u.is_active : !u.is_active;
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading) return <div className="animate-pulse p-8">Memuat data users...</div>;

  return (
    <div>
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-display-lg font-bold">Manajemen Users</h1>
          <p className="text-body-sm text-mute">Kelola akun customer, kurir, dan admin</p>
        </div>
        <button 
          onClick={() => openModal('add')}
          className="bg-primary text-on-primary hover:bg-zinc-800 transition-colors px-5 py-2.5 rounded-pill font-medium text-button-md flex items-center gap-2 self-start md:self-auto"
        >
          <UserPlus size={18} />
          Tambah User
        </button>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" size={18} />
          <input 
            type="text"
            placeholder="Cari user berdasarkan nama, email, atau ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-canvas border border-surface-pressed rounded-md pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-body-md"
          />
        </div>
        <div className="flex gap-4">
          <div className="w-40">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full bg-canvas border border-surface-pressed rounded-md px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary text-body-md font-medium"
            >
              <option value="all">Semua Role</option>
              <option value="customer">Customer</option>
              <option value="kurir">Kurir</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="w-40">
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
      </div>
      
      {/* Table Card */}
      <div className="bg-canvas rounded-xl shadow-sm border border-surface-pressed overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-canvas-soft text-body-sm-strong text-mute">
              <tr>
                <th className="px-6 py-4">User ID</th>
                <th className="px-6 py-4">Nama</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Cabang Tugas</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-pressed text-body-md">
              {paginatedUsers.map(u => {
                const assignedBranch = branches.find(b => b.id === u.branch_id);
                return (
                  <tr key={u.id} className="hover:bg-canvas-softer transition-colors">
                    <td className="px-6 py-4 text-mute text-body-sm">{u.id}</td>
                    <td className="px-6 py-4 font-bold">{u.name}</td>
                    <td className="px-6 py-4">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                        u.role === 'admin' 
                          ? 'bg-purple-100 text-purple-800' 
                          : u.role === 'kurir' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-zinc-100 text-zinc-800'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-body-sm text-mute">
                      {u.role === 'kurir' 
                        ? (assignedBranch ? assignedBranch.name : 'Semua Cabang') 
                        : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                          u.is_active 
                            ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                      >
                        {u.is_active ? 'AKTIF' : 'NONAKTIF'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => openModal('edit', u)}
                        className="p-2 text-mute hover:text-ink hover:bg-canvas-soft rounded transition-colors inline-flex items-center gap-1.5 text-body-sm font-medium"
                        title="Edit User"
                      >
                        <Edit2 size={16} />
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
              {paginatedUsers.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-mute">
                    Tidak ada user yang ditemukan
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
                {Math.min(currentPage * itemsPerPage, filteredUsers.length)}
              </span>{' '}
              dari <span className="font-medium text-ink">{filteredUsers.length}</span> user
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

      {/* Add/Edit Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-canvas rounded-xl shadow-lg border border-surface-pressed max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center px-6 py-4 border-b border-surface-pressed">
              <h2 className="text-display-sm font-bold">
                {modalMode === 'add' ? 'Tambah User Baru' : 'Edit Data User'}
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
                  <label className="block text-body-sm-strong text-mute mb-1">Nama Lengkap</label>
                  <input 
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Contoh: Deni Kurir"
                    className="w-full bg-canvas border border-surface-pressed rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-body-md"
                  />
                </div>

                <div>
                  <label className="block text-body-sm-strong text-mute mb-1">Email</label>
                  <input 
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="Contoh: deni@test.com"
                    className="w-full bg-canvas border border-surface-pressed rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-body-md"
                  />
                </div>

                {modalMode === 'add' && (
                  <div>
                    <label className="block text-body-sm-strong text-mute mb-1">Password</label>
                    <input 
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      placeholder="Masukkan password dev"
                      className="w-full bg-canvas border border-surface-pressed rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-body-md"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-body-sm-strong text-mute mb-1">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="w-full bg-canvas border border-surface-pressed rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-body-md font-medium"
                  >
                    <option value="customer">Customer</option>
                    <option value="kurir">Kurir</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {formData.role === 'kurir' && (
                  <div>
                    <label className="block text-body-sm-strong text-mute mb-1">Cabang Penugasan</label>
                    <select
                      value={formData.branch_id}
                      onChange={(e) => setFormData({...formData, branch_id: e.target.value})}
                      className="w-full bg-canvas border border-surface-pressed rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-body-md font-medium"
                    >
                      <option value="">Semua Cabang / Pusat</option>
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name} ({b.city})</option>
                      ))}
                    </select>
                    <p className="text-body-sm text-mute mt-1">
                      Kurir akan diprioritaskan untuk mengelola paket di cabang ini.
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2.5 py-2">
                  <input 
                    type="checkbox"
                    id="modal_user_is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                    className="w-4 h-4 rounded border-surface-pressed text-primary focus:ring-primary cursor-pointer"
                  />
                  <label htmlFor="modal_user_is_active" className="text-body-md font-medium cursor-pointer">
                    Akun Aktif (Dapat masuk ke aplikasi)
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
                  {modalMode === 'add' ? 'Tambah User' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
