"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUser } from '../lib/auth';

export default function AuthGuard({ allowedRoles = [], children }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const user = getUser();
    if (!user) {
      router.push('/login');
    } else if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      if (user.role === 'admin') router.push('/admin');
      else if (user.role === 'kurir') router.push('/kurir');
      else router.push('/customer');
    } else {
      setAuthorized(true);
    }
  }, [router, allowedRoles]);

  if (!authorized) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-body-md text-mute">Memeriksa akses...</div>
      </div>
    );
  }
  return <>{children}</>;
}
