"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getUser, logout } from "../lib/auth";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const pathname = usePathname();

  useEffect(() => {
    setUser(getUser());
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 bg-canvas text-ink py-4 px-6 md:px-12 shadow-sm border-b border-surface-pressed">
      <div className="max-w-[1280px] mx-auto flex items-center justify-between">
        <Link href="/" className="text-display-md font-bold hover:opacity-80 transition-opacity">
          LogistiKita
        </Link>
        <nav className="hidden md:flex gap-6 items-center">
          <Link href="/" className="font-medium text-body-md-strong hover:text-mute transition-colors">
            Beranda
          </Link>
          <Link href="/tracking" className="font-medium text-body-md-strong hover:text-mute transition-colors">
            Lacak Paket
          </Link>
          
          {user ? (
            <>
              {user.role === 'customer' && (
                <>
                  <Link href="/customer" className="font-medium text-body-md-strong hover:text-mute transition-colors">
                    Pengiriman Saya
                  </Link>
                  <Link href="/customer/buat" className="font-medium text-body-md-strong hover:text-mute transition-colors">
                    Buat Pengiriman
                  </Link>
                </>
              )}
              {user.role === 'kurir' && (
                <Link href="/kurir" className="font-medium text-body-md-strong hover:text-mute transition-colors">
                  Dashboard Kurir
                </Link>
              )}
              {user.role === 'admin' && (
                <Link href="/admin" className="font-medium text-body-md-strong hover:text-mute transition-colors">
                  Dashboard Admin
                </Link>
              )}
              
              <div className="flex items-center gap-4 ml-6 pl-6 border-l border-surface-pressed">
                <span className="font-medium text-body-md-strong">{user.name}</span>
                <button 
                  onClick={logout}
                  className="bg-canvas-soft text-ink font-medium text-button-md rounded-pill px-4 py-2 hover:bg-surface-pressed transition-colors"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className="font-medium text-body-md-strong hover:text-mute transition-colors ml-4">
                Log in
              </Link>
              <Link 
                href="/register" 
                className="bg-primary text-on-primary font-medium text-button-md rounded-pill px-4 py-2 hover:bg-black-elevated transition-colors"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
        {/* Mobile toggle */}
        <div className="md:hidden">
          {user ? (
            <button onClick={logout} className="text-sm font-bold">Logout</button>
          ) : (
            <Link href="/login" className="text-sm font-bold">Login</Link>
          )}
        </div>
      </div>
    </header>
  );
}
