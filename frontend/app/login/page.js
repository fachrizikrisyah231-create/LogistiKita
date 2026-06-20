"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '../../lib/auth';
import Link from 'next/link';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    await performLogin(email, password);
  };

  const handleQuickLogin = async (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    await performLogin(demoEmail, demoPassword);
  };

  const performLogin = async (loginEmail, loginPassword) => {
    setLoading(true);
    setError('');
    try {
      const user = await login(loginEmail, loginPassword);
      if (user.role === 'admin') router.push('/admin');
      else if (user.role === 'kurir') router.push('/kurir');
      else router.push('/customer');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Login gagal');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-73px)] flex items-center justify-center bg-canvas-soft px-[16px] py-[48px]">
      <div className="bg-canvas p-[32px] md:p-[48px] rounded-xl shadow-md border border-surface-pressed w-full max-w-[448px]">
        <h1 className="text-display-md font-bold mb-3xl text-ink">Selamat Datang Kembali</h1>
        
        {error && (
          <div className="bg-red-50 text-red-700 p-lg rounded-md mb-2xl text-body-sm font-medium border border-red-200">
            {error}
          </div>
        )}
        
        <form onSubmit={handleLogin} className="space-y-2xl">
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
              placeholder="Masukkan password Anda"
              required 
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary text-on-primary font-medium text-button-large rounded-pill px-lg py-lg hover:bg-black-elevated transition-colors mt-lg disabled:opacity-50"
          >
            {loading ? 'Memproses...' : 'Lanjutkan'}
          </button>
        </form>
        
        <div className="mt-3xl text-center text-body-md text-body">
          Belum punya akun? <Link href="/register" className="text-ink font-bold underline hover:opacity-70">Daftar sekarang</Link>
        </div>

        <div className="mt-2xl pt-2xl border-t border-surface-pressed">
          <p className="text-body-sm text-mute text-center mb-md">Quick Login (Demo)</p>
          <div className="flex flex-col gap-sm">
            <button type="button" onClick={() => handleQuickLogin('ahmad@test.com', 'password123')} className="bg-canvas-soft hover:bg-surface-pressed text-ink text-body-sm font-medium py-sm rounded-md transition-colors">Login as Customer</button>
            <button type="button" onClick={() => handleQuickLogin('deni@test.com', 'password123')} className="bg-canvas-soft hover:bg-surface-pressed text-ink text-body-sm font-medium py-sm rounded-md transition-colors">Login as Kurir</button>
            <button type="button" onClick={() => handleQuickLogin('hadi@test.com', 'password123')} className="bg-canvas-soft hover:bg-surface-pressed text-ink text-body-sm font-medium py-sm rounded-md transition-colors">Login as Admin</button>
          </div>
        </div>
      </div>
    </div>
  );
}
