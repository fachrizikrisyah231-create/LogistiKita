"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Wallet, Package, Users, MapPin, Truck } from 'lucide-react';

export default function AdminSidebar() {
  const pathname = usePathname();
  
  const links = [
    { href: '/admin', label: 'Overview', icon: LayoutDashboard },
    { href: '/admin/keuangan', label: 'Keuangan', icon: Wallet },
    { href: '/admin/pengiriman', label: 'Pengiriman', icon: Package },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/cabang', label: 'Cabang', icon: MapPin },
    { href: '/admin/kurir', label: 'Kurir', icon: Truck },
  ];

  return (
    <aside className="w-64 min-h-[calc(100vh-73px)] bg-canvas border-r border-surface-pressed p-6 hidden md:block">
      <div className="space-y-2 mt-4">
        {links.map(link => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link 
              key={link.href} 
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors font-medium text-body-md ${
                isActive ? 'bg-canvas-soft border-l-4 border-primary text-ink' : 'text-body hover:bg-canvas-softer hover:text-ink'
              }`}
            >
              <Icon size={20} />
              {link.label}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
