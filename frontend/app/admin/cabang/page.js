"use client";
import { useState, useEffect } from 'react';
import api from '../../../lib/api';

export default function AdminCabang() {
  const [cabang, setCabang] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="animate-pulse p-8">Memuat data cabang...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-display-lg font-bold">Manajemen Cabang</h1>
        <button className="bg-primary text-on-primary px-4 py-2 rounded-pill font-medium text-button-md">Tambah Cabang</button>
      </div>
      
      <div className="bg-canvas rounded-xl shadow-sm border border-surface-pressed overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-canvas-soft text-body-sm-strong text-mute">
            <tr>
              <th className="px-6 py-4">Nama Cabang</th>
              <th className="px-6 py-4">Kota</th>
              <th className="px-6 py-4">Koordinat</th>
              <th className="px-6 py-4">Urutan Rute</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-pressed text-body-md">
            {cabang.map(c => (
              <tr key={c.id} className="hover:bg-canvas-softer">
                <td className="px-6 py-4 font-bold">{c.name}</td>
                <td className="px-6 py-4">{c.city}</td>
                <td className="px-6 py-4 text-mute text-body-sm">{c.latitude}, {c.longitude}</td>
                <td className="px-6 py-4">{c.route_order}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${c.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {c.is_active ? 'AKTIF' : 'NONAKTIF'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
