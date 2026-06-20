"use client";
import { useState, useEffect } from 'react';
import api from '../../../lib/api';

export default function AdminKurir() {
  const [kurir, setKurir] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKurir();
  }, []);

  const fetchKurir = async () => {
    try {
      const res = await api.get('/admin/kurir');
      setKurir(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="animate-pulse p-8">Memuat data kurir...</div>;

  return (
    <div>
      <h1 className="text-display-lg font-bold mb-8">Manajemen Kurir</h1>
      
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
            {kurir.map(k => (
              <tr key={k.id} className="hover:bg-canvas-softer">
                <td className="px-6 py-4 font-bold">{k.name}</td>
                <td className="px-6 py-4">{k.email}</td>
                <td className="px-6 py-4 text-mute">{k.branch_name || 'Semua Cabang'}</td>
                <td className="px-6 py-4 font-bold text-primary">{k.tugas_aktif || 0} Paket</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
