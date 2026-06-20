"use client";
import { useState, useEffect } from 'react';
import api from '../../../lib/api';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="animate-pulse p-8">Memuat data users...</div>;

  return (
    <div>
      <h1 className="text-display-lg font-bold mb-8">Manajemen Users</h1>
      
      <div className="bg-canvas rounded-xl shadow-sm border border-surface-pressed overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-canvas-soft text-body-sm-strong text-mute">
            <tr>
              <th className="px-6 py-4">ID</th>
              <th className="px-6 py-4">Nama</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-pressed text-body-md">
            {users.map(u => (
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
