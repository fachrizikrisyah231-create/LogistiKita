'use client';

import { useState, useEffect } from 'react';

export default function SimulatorDashboard() {
  // === STATE UNTUK TRIGGER CLIENT ===
  const [formData, setFormData] = useState({
    order_id: '',
    user_id: 'USR-001',
    alamat_tujuan: 'Jl. Merdeka No. 45, Bandung',
    jarak: 15.5,
    nilai_transaksi: 150000
  });

  const [triggerLog, setTriggerLog] = useState(null);
  const [loadingTrigger, setLoadingTrigger] = useState(false);

  // === STATE UNTUK SMARTBANK MONITOR ===
  const [ledger, setLedger] = useState([]);
  const [accounts, setAccounts] = useState(null);
  const [gatewayLogs, setGatewayLogs] = useState([]);

  // === STATE UNTUK WEBHOOK RECEIVER ===
  const [webhookLogs, setWebhookLogs] = useState([]);

  // Auto-generate ID saat mount
  useEffect(() => {
    generateRandomOrderId();
  }, []);

  // Polling SmartBank & Webhook Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resLedger, resAccounts, resGatewayLogs, resWebhook] = await Promise.all([
          fetch('http://localhost:4000/smartbank/ledger?limit=5'),
          fetch('http://localhost:4000/smartbank/accounts'),
          fetch('http://localhost:5000/gateway/logs?limit=3'),
          fetch('http://localhost:5500/webhook/logs?limit=5')
        ]);
        
        if (resLedger.ok) {
          const data = await resLedger.json();
          setLedger(data.ledger);
        }
        if (resAccounts.ok) {
          const data = await resAccounts.json();
          setAccounts(data);
        }
        if (resGatewayLogs.ok) {
          const data = await resGatewayLogs.json();
          setGatewayLogs(data.logs);
        }
        if (resWebhook.ok) {
          const data = await resWebhook.json();
          setWebhookLogs(data.logs);
        }
      } catch (err) {
        console.error('Gagal mengambil data Live', err);
      }
    };

    fetchData(); // fetch awal
    const interval = setInterval(fetchData, 2000); // polling tiap 2 detik
    return () => clearInterval(interval);
  }, []);

  const generateRandomOrderId = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    setFormData(prev => ({ ...prev, order_id: `ORD-SIM-${randomNum}` }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'jarak' || name === 'nilai_transaksi' ? Number(value) : value
    }));
  };

  const handleTrigger = async (sourceApp) => {
    setLoadingTrigger(true);
    setTriggerLog(null);

    const url = sourceApp === 'marketplace' 
      ? 'http://localhost:5500/trigger/marketplace' 
      : 'http://localhost:5500/trigger/supplierhub';

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      setTriggerLog({ status: res.status, ok: res.ok, data });
      
      if (res.ok) {
        generateRandomOrderId(); // Auto-generate next ID on success
      }
    } catch (err) {
      setTriggerLog({ status: 500, ok: false, data: { message: 'Koneksi ke Mock Trigger gagal.' } });
    } finally {
      setLoadingTrigger(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-[1400px] mx-auto">
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Dashboard Simulator Terpadu</h1>
          <p className="text-gray-600 mt-2">Kirim request dari sisi klien dan pantau langsung proses mutasi keuangannya di SmartBank secara Real-Time.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* PANEL KIRI: CLIENT SIMULATOR */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">1. Client Trigger Simulator</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Order ID</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" name="order_id" value={formData.order_id} onChange={handleChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                    />
                    <button onClick={generateRandomOrderId} className="px-3 py-2 bg-gray-100 text-gray-600 rounded-md text-sm hover:bg-gray-200" title="Acak Order ID">
                      🔄
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">User ID</label>
                  <select name="user_id" value={formData.user_id} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-indigo-500">
                    <option value="USR-001">USR-001 (Rp50.000)</option>
                    <option value="USR-002">USR-002 (Rp50.000)</option>
                    <option value="USR-003">USR-003 (Rp50.000)</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Alamat Tujuan</label>
                  <input 
                    type="text" name="alamat_tujuan" value={formData.alamat_tujuan} onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Jarak (Km)</label>
                  <input 
                    type="number" name="jarak" step="0.1" value={formData.jarak} onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Nilai Transaksi (Rp)</label>
                  <input 
                    type="number" name="nilai_transaksi" value={formData.nilai_transaksi} onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => handleTrigger('marketplace')}
                  disabled={loadingTrigger}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-4 rounded-lg shadow-sm transition disabled:opacity-50 text-sm"
                >
                  🛒 Kirim via Marketplace
                </button>
                <button 
                  onClick={() => handleTrigger('supplierhub')}
                  disabled={loadingTrigger}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg shadow-sm transition disabled:opacity-50 text-sm"
                >
                  🏭 Kirim via SupplierHub
                </button>
              </div>
            </div>

            {/* Trigger Log Panel */}
            <div className="bg-[#1e1e1e] rounded-xl overflow-hidden shadow-sm">
              <div className="bg-[#2d2d2d] px-4 py-2 flex items-center justify-between border-b border-[#404040]">
                <span className="text-xs font-mono text-gray-300">Trigger Console</span>
                {triggerLog && (
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${triggerLog.ok ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    HTTP {triggerLog.status}
                  </span>
                )}
              </div>
              <div className="p-4 h-48 overflow-y-auto">
                {loadingTrigger && <p className="text-sm font-mono text-gray-400 animate-pulse">Menunggu respon...</p>}
                {!loadingTrigger && !triggerLog && <p className="text-sm font-mono text-gray-500 italic">Belum ada request yang dikirim.</p>}
                {!loadingTrigger && triggerLog && (
                  <pre className={`text-xs font-mono ${triggerLog.ok ? 'text-green-300' : 'text-red-300'}`}>
                    {JSON.stringify(triggerLog.data, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </div>

          {/* PANEL KANAN: SMARTBANK MONITOR */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full flex flex-col">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h2 className="text-xl font-bold text-gray-800">2. SmartBank Live Monitor</h2>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                  <span className="text-xs font-semibold text-green-600 uppercase tracking-wide">Live Polling</span>
                </div>
              </div>

              {/* Status Akun Utama */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <p className="text-xs text-indigo-800 font-semibold uppercase mb-1">LogistiKita</p>
                  <p className="text-lg font-bold text-indigo-900">
                    Rp{accounts?.service_accounts?.logistikita?.toLocaleString('id-ID') || 0}
                  </p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-xs text-blue-800 font-semibold uppercase mb-1">Bank Reserve</p>
                  <p className="text-lg font-bold text-blue-900">
                    Rp{accounts?.service_accounts?.bank_reserve?.toLocaleString('id-ID') || 0}
                  </p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <p className="text-xs text-orange-800 font-semibold uppercase mb-1">Fee Gateway</p>
                  <p className="text-lg font-bold text-orange-900">
                    Rp{accounts?.service_accounts?.gateway?.toLocaleString('id-ID') || 0}
                  </p>
                </div>
              </div>

              {/* Tabel Ledger Live */}
              <div className="flex-1 overflow-hidden flex flex-col">
                <h3 className="text-sm font-bold text-gray-700 mb-3">5 Transaksi Terakhir</h3>
                <div className="flex-1 overflow-y-auto">
                  {ledger.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 italic text-sm">
                      Belum ada transaksi terekam.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {ledger.map(tx => (
                        <div key={tx.transaction_id} className="bg-gray-50 border border-gray-100 p-3 rounded-lg text-sm transition-all animate-fade-in">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className="font-mono font-bold text-indigo-700">{tx.transaction_id}</span>
                              <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">{tx.order_id}</span>
                            </div>
                            <span className="text-xs text-gray-500">{new Date(tx.timestamp).toLocaleTimeString('id-ID')}</span>
                          </div>
                          
                          <div className="flex justify-between items-center text-gray-700">
                            <div>
                              <span className="font-semibold">{tx.from_user}</span> ➔ LogistiKita
                            </div>
                            <div className="font-bold text-red-600 text-base">
                              -Rp{tx.total_debit.toLocaleString('id-ID')}
                            </div>
                          </div>
                          
                          <div className="mt-2 pt-2 border-t border-gray-200 flex gap-4 text-xs text-gray-500">
                            <span>Ongkir: Rp{tx.amount.toLocaleString()}</span>
                            <span>Fee Bank: Rp{tx.fee_bank.toLocaleString()}</span>
                            <span>Fee GW: Rp{tx.fee_gateway.toLocaleString()}</span>
                            <span>Pajak: Rp{tx.pajak_sistem.toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Gateway/LogistiKita Request Console */}
              <div className="mt-4 bg-[#1e1e1e] rounded-xl overflow-hidden shadow-sm h-48 flex flex-col">
                <div className="bg-[#2d2d2d] px-4 py-2 flex items-center justify-between border-b border-[#404040]">
                  <span className="text-xs font-mono text-gray-300">Incoming Requests (API Gateway / SmartBank)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400">
                    Port 5000 & 4000
                  </span>
                </div>
                <div className="p-4 flex-1 overflow-y-auto space-y-3">
                  {gatewayLogs.length === 0 ? (
                    <p className="text-sm font-mono text-gray-500 italic">Menunggu request dari LogistiKita...</p>
                  ) : (
                    gatewayLogs.map((log, idx) => (
                      <div key={idx} className="border-b border-gray-700 pb-2 last:border-0 last:pb-0">
                        <div className="text-xs font-mono text-gray-400 mb-1">
                          [{new Date(log.timestamp).toLocaleTimeString()}] <span className="text-blue-300">{log.method} {log.path}</span>
                        </div>
                        <pre className={`text-xs font-mono ${log.smartbank_response_status === 'SUCCESS' ? 'text-green-300' : 'text-red-300'}`}>
                          {JSON.stringify(log, null, 2)}
                        </pre>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* PANEL KANAN 2: ORIGIN WEBHOOK RECEIVER */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full flex flex-col">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h2 className="text-xl font-bold text-gray-800">3. Origin Webhook Receiver</h2>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                  </span>
                  <span className="text-xs font-semibold text-orange-600 uppercase tracking-wide">Live Polling</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Panel ini menyimulasikan aplikasi asal (Marketplace/SupplierHub) yang sedang mendengarkan/menunggu *callback webhook* dari LogistiKita mengenai perubahan status paket.
              </p>

              {/* Webhook Log Console */}
              <div className="flex-1 bg-[#1e1e1e] rounded-xl overflow-hidden shadow-sm flex flex-col min-h-[400px]">
                <div className="bg-[#2d2d2d] px-4 py-2 flex items-center justify-between border-b border-[#404040]">
                  <span className="text-xs font-mono text-gray-300">Incoming Webhooks (Port 5500)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-orange-500/20 text-orange-400">
                    Listening
                  </span>
                </div>
                <div className="p-4 flex-1 overflow-y-auto space-y-3">
                  {webhookLogs.length === 0 ? (
                    <p className="text-sm font-mono text-gray-500 italic">Menunggu update status dari Admin LogistiKita...</p>
                  ) : (
                    webhookLogs.map((log) => (
                      <div key={log.id} className="border-b border-gray-700 pb-3 last:border-0 last:pb-0 animate-fade-in">
                        <div className="text-xs font-mono text-gray-400 mb-1 flex justify-between">
                          <span>[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                          <span className="text-orange-300 font-bold uppercase">{log.source_app}</span>
                        </div>
                        <pre className="text-xs font-mono text-green-300 whitespace-pre-wrap break-all">
                          {JSON.stringify(log.payload, null, 2)}
                        </pre>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
