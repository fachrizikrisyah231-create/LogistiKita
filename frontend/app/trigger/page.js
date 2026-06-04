'use client';

import { useState, useEffect } from 'react';

export default function TriggerPage() {
  const [formData, setFormData] = useState({
    order_id: '',
    user_id: 'USR-001',
    alamat_tujuan: 'Jl. Merdeka No. 45, Bandung',
    jarak: 15.5,
    nilai_transaksi: 150000
  });

  const [responseLog, setResponseLog] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorLog, setErrorLog] = useState(null);

  // Auto-generate random Order ID when component mounts
  useEffect(() => {
    generateRandomOrderId();
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
    setLoading(true);
    setResponseLog(null);
    setErrorLog(null);

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
      
      if (!res.ok) {
        setErrorLog(data);
      } else {
        setResponseLog(data);
        generateRandomOrderId(); // Auto-generate next ID on success
      }
    } catch (err) {
      setErrorLog({ message: 'Gagal menghubungi server Mock Trigger di localhost:5500' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Simulator Aplikasi Klien</h1>
          <p className="text-gray-600 mt-2">Kirim request pengiriman ke LogistiKita seolah-olah Anda adalah Marketplace atau SupplierHub.</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
          <h2 className="text-xl font-semibold mb-6">Parameter Request</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Order ID</label>
              <div className="flex gap-2">
                <input 
                  type="text" name="order_id" value={formData.order_id} onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                />
                <button onClick={generateRandomOrderId} className="px-3 py-2 bg-gray-100 text-gray-600 rounded-md text-sm hover:bg-gray-200">
                  Acak
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">User ID (Simulasi Token)</label>
              <select name="user_id" value={formData.user_id} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-indigo-500">
                <option value="USR-001">USR-001 (Budi Santoso)</option>
                <option value="USR-002">USR-002 (Siti Rahayu)</option>
                <option value="USR-003">USR-003 (Ahmad Fauzi)</option>
                <option value="USR-004">USR-004 (Dewi Lestari)</option>
                <option value="USR-005">USR-005 (Eko Prasetyo)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Alamat Tujuan</label>
              <input 
                type="text" name="alamat_tujuan" value={formData.alamat_tujuan} onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Jarak Pengiriman (Km)</label>
              <input 
                type="number" name="jarak" step="0.1" value={formData.jarak} onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nilai Transaksi (Rp)</label>
              <input 
                type="number" name="nilai_transaksi" value={formData.nilai_transaksi} onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <button 
            onClick={() => handleTrigger('marketplace')}
            disabled={loading}
            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-medium py-3 px-4 rounded-xl shadow-sm transition disabled:opacity-50"
          >
            🛒 Kirim dari Marketplace
          </button>
          <button 
            onClick={() => handleTrigger('supplierhub')}
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl shadow-sm transition disabled:opacity-50"
          >
            🏭 Kirim dari SupplierHub
          </button>
        </div>

        {/* LOG RESPONSE BLOCK */}
        {(responseLog || errorLog) && (
          <div className="bg-gray-900 rounded-xl overflow-hidden shadow-lg mt-8">
            <div className="bg-gray-800 px-4 py-2 flex items-center justify-between border-b border-gray-700">
              <span className="text-xs font-mono text-gray-300">Terminal Response</span>
              <span className={`text-xs px-2 py-1 rounded font-semibold ${responseLog ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                {responseLog ? '201 SUCCESS' : 'ERROR'}
              </span>
            </div>
            <div className="p-4 overflow-x-auto">
              <pre className="text-sm font-mono text-gray-300">
                {JSON.stringify(responseLog || errorLog, null, 2)}
              </pre>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
