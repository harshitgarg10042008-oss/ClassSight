'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated (this is a simple check - in production you'd want proper token validation)
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    // If specific roles are required, check user role
    if (allowedRoles && allowedRoles.length > 0) {
      const userRole = localStorage.getItem('userRole');
      if (!userRole || !allowedRoles.includes(userRole)) {
        router.push('/unauthorized');
        return;
      }
    }
  }, [router, allowedRoles]);

  return <>{children}</>;
}
