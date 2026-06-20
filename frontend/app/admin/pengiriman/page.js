"use client";
import { useState, useEffect } from 'react';
import api from '../../../lib/api';

export default function AdminPengiriman() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [kurirList, setKurirList] = useState([]);

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

  if (loading) return <div className="animate-pulse p-8">Memuat data pengiriman...</div>;

  return (
    <div>
      <h1 className="text-display-lg font-bold mb-8">Manajemen Pengiriman</h1>
      
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
              {shipments.map(s => (
                <tr key={s.id} className="hover:bg-canvas-softer">
                  <td className="px-6 py-4">
                    <div className="font-bold">{s.order_id}</div>
                    <div className="text-body-sm text-mute">{new Date(s.created_at).toLocaleDateString('id-ID')}</div>
                    <div className="text-body-sm-strong bg-canvas-soft border border-surface-pressed inline-block px-2 py-1 rounded mt-1 capitalize">
                      {s.tipe_pengiriman}
                    </div>
                  </td>
                  <td className="px-6 py-4 max-w-xs">
                    <div className="truncate mb-1" title={s.alamat_asal}><span className="font-medium text-mute">Dari:</span> {s.alamat_asal}</div>
                    <div className="truncate" title={s.alamat_tujuan}><span className="font-medium text-mute">Ke:</span> {s.alamat_tujuan}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold">Rp{s.total_biaya?.toLocaleString('id-ID')}</div>
                  </td>
                  <td className="px-6 py-4">
                    <select 
                      value={s.status}
                      onChange={(e) => handleUpdateStatus(s.id, e.target.value)}
                      className="bg-canvas border border-surface-pressed rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary font-medium"
                    >
                      {STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <select 
                      value={s.assigned_kurir_id || ''}
                      onChange={(e) => handleAssignKurir(s.id, e.target.value)}
                      className="bg-canvas border border-surface-pressed rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary w-full max-w-[150px]"
                    >
                      <option value="">-- Assign Kurir --</option>
                      {kurirList.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
              {shipments.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-mute">Tidak ada data pengiriman</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
