'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from './Layout';
import { api } from '@/lib/api';

interface PageLayoutProps {
  children: React.ReactNode;
  pageId: string;
}

export function PageLayout({ children, pageId }: PageLayoutProps) {
  const router = useRouter();
  const [userFullName, setUserFullName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const fullName = localStorage.getItem('userFullName') || '';
    const role = localStorage.getItem('userRole') || '';
    const token = localStorage.getItem('token');
    const establishSession = async () => {
      try {
        if (token) {
          api.setToken(token);
        } else {
          const refreshed = await api.refresh();
          localStorage.setItem('token', refreshed.token);
        }
        setUserFullName(fullName);
        setUserRole(role);
      } catch {
        router.push('/login');
      }
    };
    void establishSession();
  }, [router]);

  const handlePageChange = (page: string) => {
    const pathMap: Record<string, string> = {
      teacher: '/teacher',
      enrollment: '/enrollment',
      analytics: '/analytics',
      hod: '/hod',
      admin: '/admin',
      student: '/student',
    };
    router.push(pathMap[page] || '/teacher');
  };

  const handleLogout = () => {
    void fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8080'}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    api.clearToken();
    localStorage.removeItem('token');
    localStorage.removeItem('userFullName');
    localStorage.removeItem('userRole');
    router.push('/login');
  };

  if (!mounted) {
    return <div>Loading...</div>;
  }

  return (
    <Layout
      userFullName={userFullName}
      userRole={userRole}
      currentPage={pageId}
      onPageChange={handlePageChange}
      onLogout={handleLogout}
    >
      {children}
    </Layout>
  );
}
