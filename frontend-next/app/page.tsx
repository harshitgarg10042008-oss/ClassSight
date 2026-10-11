'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { api } from '@/lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [userFullName, setUserFullName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [currentPage, setCurrentPage] = useState('teacher');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    // Set user info
    const fullName = localStorage.getItem('userFullName') || '';
    const role = localStorage.getItem('userRole') || '';
    setUserFullName(fullName);
    setUserRole(role);
    api.setToken(token);

    // Set initial page based on URL
    if (pathname === '/login') {
      router.push('/login');
      return;
    }

    // Map URL paths to page IDs
    const pageMap: Record<string, string> = {
      '/teacher': 'teacher',
      '/enrollment': 'enrollment',
      '/analytics': 'analytics',
      '/hod': 'hod',
      '/admin': 'admin',
      '/student': 'student',
    };

    const pageId = pageMap[pathname] || 'teacher';
    setCurrentPage(pageId);
  }, [router, pathname]);

  const handlePageChange = (page: string) => {
    setCurrentPage(page);
    // Update URL to match page
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
    api.clearToken();
    localStorage.removeItem('token');
    localStorage.removeItem('userFullName');
    localStorage.removeItem('userRole');
    router.push('/login');
  };

  // Auto-redirect to the appropriate page based on current page state
  useEffect(() => {
    const pathMap: Record<string, string> = {
      teacher: '/teacher',
      enrollment: '/enrollment',
      analytics: '/analytics',
      hod: '/hod',
      admin: '/admin',
      student: '/student',
    };

    if (currentPage !== pathname && pathMap[currentPage] !== pathname) {
      router.push(pathMap[currentPage] || '/teacher');
    }
  }, [currentPage, pathname, router]);

  if (!mounted) {
    return <div>Loading...</div>;
  }

  // Render a simple dashboard message since we redirect to specific pages
  return (
    <Layout
      userFullName={userFullName}
      userRole={userRole}
      currentPage={currentPage}
      onPageChange={handlePageChange}
      onLogout={handleLogout}
    >
      <div>
        <div className="alert alert-info">
          Use the navigation menu to access different sections. Each section has its own dedicated page.
        </div>
      </div>
    </Layout>
  );
}
