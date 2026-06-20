"use client";

import AuthGuard from '../../components/AuthGuard';
import AdminSidebar from '../../components/admin/AdminSidebar';

export default function AdminLayout({ children }) {
  return (
    <AuthGuard allowedRoles={['admin']}>
      <div className="flex bg-canvas-softer min-h-[calc(100vh-73px)]">
        <AdminSidebar />
        <main className="flex-1 p-8 md:p-12 overflow-y-auto">
          <div className="max-w-[1200px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
