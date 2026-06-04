'use client';

import { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:3001/logistikita';

export default function AdminDashboard() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Status valid
  const STATUSES = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'FAILED'];

  const fetchShipments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/admin/shipments`);
      const result = await res.json();
      if (result.success) {
        setShipments(result.data);
      } else {
        setError(result.error?.message || 'Gagal mengambil data');
      }
    } catch (err) {
      setError('Gagal menghubungi server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, []);

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/admin/shipments/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const result = await res.json();

      if (result.success) {
        alert(`Status ${orderId} berhasil diubah ke ${newStatus}`);
        fetchShipments(); // Refresh data
      } else {
        alert(`Gagal: ${result.error?.message}`);
      }
    } catch (err) {
      alert('Terjadi kesalahan jaringan');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Memuat data...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Admin Dashboard - Pengiriman</h1>
        
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Waktu</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID / User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Biaya</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status Terkini</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {shipments.map((ship) => (
                  <tr key={ship.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(ship.created_at).toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{ship.order_id}</div>
                      <div className="text-sm text-gray-500">{ship.user_id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-semibold">Total: Rp{ship.total_biaya.toLocaleString('id-ID')}</div>
                      <div className="text-xs text-gray-500">Nilai Transaksi: Rp{ship.nilai_transaksi.toLocaleString('id-ID')}</div>
                      <div className="text-xs text-gray-500">Ongkir: Rp{ship.ongkir.toLocaleString('id-ID')}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${ship.status === 'DELIVERED' ? 'bg-green-100 text-green-800' : 
                          ship.status === 'FAILED' ? 'bg-red-100 text-red-800' : 
                          ship.status === 'SHIPPED' ? 'bg-blue-100 text-blue-800' : 
                          'bg-yellow-100 text-yellow-800'}`}>
                        {ship.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <select 
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
                        value={ship.status}
                        onChange={(e) => {
                          if (e.target.value !== ship.status && confirm(`Ubah status menjadi ${e.target.value}?`)) {
                            handleUpdateStatus(ship.order_id, e.target.value);
                          }
                        }}
                      >
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
                
                {shipments.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">Belum ada data pengiriman.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
