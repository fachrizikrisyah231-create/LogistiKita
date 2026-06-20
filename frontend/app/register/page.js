"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { register } from '../../lib/auth';
import Link from 'next/link';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register(name, email, password);
      router.push('/customer');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Registrasi gagal');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-73px)] flex items-center justify-center bg-canvas-soft px-[16px] py-[48px]">
      <div className="bg-canvas p-[32px] md:p-[48px] rounded-xl shadow-md border border-surface-pressed w-full max-w-[448px]">
        <h1 className="text-display-md font-bold mb-3xl text-ink">Buat Akun Baru</h1>
        
        {error && (
          <div className="bg-red-50 text-red-700 p-lg rounded-md mb-2xl text-body-sm font-medium border border-red-200">
            {error}
          </div>
        )}
        
        <form onSubmit={handleRegister} className="space-y-2xl">
          <div>
            <label className="block text-ink mb-sm text-body-sm-strong">Nama Lengkap</label>
            <input 
              type="text" 
              className="w-full bg-canvas-soft border-2 border-transparent focus:border-primary focus:bg-canvas p-lg rounded-md text-body-md text-ink outline-none transition-colors" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="Contoh: John Doe"
              required 
            />
          </div>
          <div>
            <label className="block text-ink mb-sm text-body-sm-strong">Email</label>
            <input 
              type="email" 
              className="w-full bg-canvas-soft border-2 border-transparent focus:border-primary focus:bg-canvas p-lg rounded-md text-body-md text-ink outline-none transition-colors" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="Masukkan email Anda"
              required 
            />
          </div>
          <div>
            <label className="block text-ink mb-sm text-body-sm-strong">Password</label>
            <input 
              type="password" 
              className="w-full bg-canvas-soft border-2 border-transparent focus:border-primary focus:bg-canvas p-lg rounded-md text-body-md text-ink outline-none transition-colors" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="Minimal 6 karakter"
              required 
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary text-on-primary font-medium text-button-large rounded-pill px-lg py-lg hover:bg-black-elevated transition-colors mt-lg disabled:opacity-50"
          >
            {loading ? 'Memproses...' : 'Daftar Sekarang'}
          </button>
        </form>
        
        <div className="mt-3xl text-center text-body-md text-body">
          Sudah punya akun? <Link href="/login" className="text-ink font-bold underline hover:opacity-70">Masuk di sini</Link>
        </div>
      </div>
    </div>
  );
}
