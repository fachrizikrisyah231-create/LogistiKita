"use client";
import { useState, useEffect } from 'react';
import api from '../../lib/api';
import AuthGuard from '../../components/AuthGuard';
import TaskCard from '../../components/kurir/TaskCard';

export default function KurirDashboard() {
  const [tugas, setTugas] = useState([]);
  const [riwayat, setRiwayat] = useState([]);
  const [branches, setBranches] = useState([]);
  const [activeTab, setActiveTab] = useState('aktif'); // 'aktif' | 'riwayat'

  useEffect(() => {
    fetchData();
    fetchBranches();
    
    // Polling setiap 5 detik
    const interval = setInterval(() => {
      fetchData();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const resTugas = await api.get('/kurir/tugas');
      setTugas(resTugas.data.data.shipments || resTugas.data.data || []);
      
      const resRiwayat = await api.get('/kurir/riwayat');
      setRiwayat(resRiwayat.data.data.shipments || resRiwayat.data.data || []);
    } catch (err) {
      console.error('Failed to fetch', err);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await api.get('/cabang/list');
      setBranches(res.data.data.branches || []);
    } catch (err) {
      console.error('Failed to fetch branches', err);
    }
  };

  const handleUpdateStatus = async (id, status, branchId = null) => {
    try {
      let endpoint = '';
      if (status === 'PICKUP') endpoint = `/kurir/shipments/${id}/status/pickup`;
      else if (status === 'AT_BRANCH') endpoint = `/kurir/shipments/${id}/status/tiba-cabang`;
      else if (status === 'IN_TRANSIT') endpoint = `/kurir/shipments/${id}/status/lanjut-transit`;
      else if (status === 'OUT_FOR_DELIVERY') endpoint = `/kurir/shipments/${id}/status/antar`;
      else if (status === 'DELIVERED') endpoint = `/kurir/shipments/${id}/status/delivered`;
      else if (status === 'FAILED') endpoint = `/kurir/shipments/${id}/status/gagal`;

      await api.put(endpoint, { branch_id: branchId });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Gagal update status');
    }
  };

  return (
    <AuthGuard allowedRoles={['kurir', 'admin']}>
      <div className="max-w-[1280px] mx-auto px-6 md:px-12 py-12">
        <h1 className="text-display-lg font-bold mb-8">Dashboard Kurir</h1>
        
        {/* Tab Navigation for Mobile */}
        <div className="flex md:hidden gap-4 mb-6 border-b border-surface-pressed pb-2 overflow-x-auto">
          <button 
            className={`whitespace-nowrap pb-2 border-b-2 font-bold ${activeTab === 'aktif' ? 'border-primary text-ink' : 'border-transparent text-mute'}`}
            onClick={() => setActiveTab('aktif')}
          >
            Tugas Aktif ({tugas.length})
          </button>
          <button 
            className={`whitespace-nowrap pb-2 border-b-2 font-bold ${activeTab === 'riwayat' ? 'border-primary text-ink' : 'border-transparent text-mute'}`}
            onClick={() => setActiveTab('riwayat')}
          >
            Riwayat Hari Ini ({riwayat.length})
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main Content Area (Tugas Aktif) */}
          <div className={`md:col-span-2 space-y-6 ${activeTab !== 'aktif' && 'hidden md:block'}`}>
            <h2 className="hidden md:block text-display-sm font-bold mb-6">Tugas Aktif ({tugas.length})</h2>
            {tugas.length === 0 ? (
               <div className="bg-canvas-soft rounded-xl p-12 text-center text-mute">Tidak ada tugas aktif.</div>
            ) : (
               tugas.map(t => <TaskCard key={t.id} t={t} branches={branches} handleUpdateStatus={handleUpdateStatus} />)
            )}
          </div>

          {/* Sidebar Area (Riwayat) */}
          <div className={`md:col-span-1 space-y-6 ${activeTab !== 'riwayat' && 'hidden md:block'}`}>
            <div className="bg-canvas-soft rounded-xl p-6 md:p-8 sticky top-24">
              <h2 className="text-display-sm font-bold mb-6">Selesai Hari Ini</h2>
              {riwayat.length === 0 ? (
                <div className="text-body-sm text-mute">Belum ada pengiriman yang diselesaikan hari ini.</div>
              ) : (
                <div className="space-y-4">
                  {riwayat.map(r => (
                    <div key={r.id} className="border-b border-surface-pressed pb-4 last:border-0 last:pb-0">
                      <div className="flex justify-between">
                        <span className="font-bold text-body-md">{r.order_id}</span>
                        <span className={`text-caption px-2 py-1 rounded-md font-bold ${r.status === 'DELIVERED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{r.status}</span>
                      </div>
                      <p className="text-body-sm text-mute mt-1 truncate">{r.alamat_tujuan}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
