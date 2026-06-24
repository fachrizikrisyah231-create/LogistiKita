"use client";
import { useState, useEffect, useMemo } from 'react';
import api from '../../../lib/api';
import ModalUser from '../../../components/admin/ModalUser';
import Pagination from '../../../components/ui/Pagination';
import { Search, Edit2 } from 'lucide-react';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);

  // Search & Pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (id, role) => {
    try {
      await api.put(`/admin/users/${id}`, { role });
      fetchUsers();
    } catch (err) {
      alert('Gagal mengubah role user');
    }
  };

  const handleSave = async (data) => {
    try {
      if (editData) {
        await api.put(`/admin/users/${editData.id}`, { name: data.name, role: data.role });
      } else {
        await api.post('/admin/users', data);
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Gagal menyimpan user');
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
  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [users, searchQuery]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const currentData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  if (loading) return <div className="animate-pulse p-8">Memuat data users...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-display-lg font-bold">Manajemen Users</h1>
        <button onClick={openAddModal} className="bg-primary text-on-primary px-4 py-2 rounded-pill font-medium text-button-md hover:bg-opacity-90">Tambah User</button>
      </div>
      
      <div className="bg-canvas rounded-xl shadow-sm border border-surface-pressed overflow-hidden flex flex-col">
        <div className="p-4 border-b border-surface-pressed bg-canvas-soft flex gap-4">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-mute">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Cari nama, email, atau ID..."
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
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Nama</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-pressed text-body-md">
              {currentData.length > 0 ? currentData.map(u => (
                <tr key={u.id} className="hover:bg-canvas-softer">
                  <td className="px-6 py-4 text-mute">{u.id}</td>
                  <td className="px-6 py-4 font-bold">{u.name}</td>
                  <td className="px-6 py-4">{u.email}</td>
                  <td className="px-6 py-4">
                    <select 
                      value={u.role}
                      onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                      className="bg-canvas border border-surface-pressed rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary font-medium capitalize"
                    >
                      <option value="customer">Customer</option>
                      <option value="kurir">Kurir</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openEditModal(u)} className="text-primary hover:text-opacity-80 inline-flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-md text-sm font-medium transition-colors">
                      <Edit2 size={16} /> Edit Detail
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-mute">Tidak ada data user ditemukan.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      </div>

      <ModalUser
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        initialData={editData}
      />
    </div>
  );
}
