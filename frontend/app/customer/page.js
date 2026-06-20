"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '../../lib/api';
import AuthGuard from '../../components/AuthGuard';

export default function PengirimanSaya() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchShipments();
  }, []);

  const fetchShipments = async () => {
    try {
      const res = await api.get('/shipments/me');
      setShipments(res.data.data.shipments || res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard allowedRoles={['customer', 'admin']}>
      <div className="max-w-[1280px] mx-auto px-6 md:px-12 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h1 className="text-display-lg font-bold">Pengiriman Saya</h1>
          <Link 
            href="/customer/buat" 
            className="bg-primary text-on-primary font-medium text-button-md rounded-pill px-6 py-3 hover:bg-black-elevated transition-colors"
          >
            Buat Pengiriman
          </Link>
        </div>

        {loading ? (
          <div className="text-body-md text-mute">Memuat data...</div>
        ) : shipments.length === 0 ? (
          <div className="bg-canvas-soft rounded-xl p-12 text-center">
            <h2 className="text-display-md font-bold mb-4">Belum ada pengiriman</h2>
            <p className="text-body-md text-body mb-8">Anda belum pernah membuat pengiriman sebelumnya.</p>
            <Link 
              href="/customer/buat" 
              className="bg-primary text-on-primary font-medium text-button-md rounded-pill px-6 py-3 hover:bg-black-elevated transition-colors inline-block"
            >
              Mulai Kirim Barang
            </Link>
          </div>
        ) : (
          <div className="bg-canvas rounded-xl shadow-md border border-surface-pressed overflow-hidden">
            <div className="divide-y divide-surface-pressed">
              {shipments.map(s => (
                <div key={s.id} className="p-6 md:p-8 flex flex-col md:flex-row justify-between gap-6 hover:bg-canvas-softer transition-colors">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-body-lg">{s.order_id}</span>
                      <span className="bg-canvas-soft px-3 py-1 rounded-pill text-body-sm-strong border border-surface-pressed">
                        {s.tipe_pengiriman.toUpperCase()}
                      </span>
                      <span className="bg-canvas-soft px-3 py-1 rounded-pill text-body-sm-strong border border-surface-pressed font-medium text-primary">
                        {s.status}
                      </span>
                    </div>
                    
                    <div className="flex items-center text-body-md text-body gap-4 mt-2">
                      <div className="max-w-[200px] truncate" title={s.alamat_asal}>{s.alamat_asal}</div>
                      <div className="text-mute">→</div>
                      <div className="max-w-[200px] truncate" title={s.alamat_tujuan}>{s.alamat_tujuan}</div>
                    </div>
                    
                    <div className="text-body-sm text-mute">
                      Dibuat pada {new Date(s.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-start md:items-end justify-between gap-4 border-t md:border-t-0 pt-4 md:pt-0">
                    <div className="text-body-lg font-bold">
                      Rp{s.total_biaya?.toLocaleString('id-ID')}
                    </div>
                    <Link 
                      href={`/tracking?order_id=${s.order_id}`}
                      className="text-body-md-strong text-ink underline hover:opacity-70"
                    >
                      Lacak Paket
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
