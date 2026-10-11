'use client';

import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
  userFullName: string;
  userRole: string;
  currentPage: string;
  onPageChange: (page: string) => void;
  onLogout: () => void;
}

export function Layout({ children, userFullName, userRole, currentPage, onPageChange, onLogout }: LayoutProps) {
  const navItems = [
    ...(['TEACHER', 'ADMIN', 'HOD'].includes(userRole) ? [
      { id: 'teacher', label: 'Take Attendance', icon: '📷' },
      { id: 'enrollment', label: 'Enrollment', icon: '👤' },
      { id: 'analytics', label: 'Analytics', icon: '📊' },
    ] : []),
    ...(userRole === 'STUDENT' ? [{ id: 'student', label: 'My Attendance', icon: '🎓' }] : []),
    ...(['HOD', 'ADMIN'].includes(userRole) ? [{ id: 'hod', label: 'Disputes & Audit', icon: '⚖️' }] : []),
    ...(userRole === 'ADMIN' ? [{ id: 'admin', label: 'Timetable Admin', icon: '🗓️' }] : []),
  ];

  const initials = userFullName.split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?';

  return (
    <div className="app-layout">
      <nav className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark">
            <div className="logo-icon">C</div>
            <div>
              <div className="logo-text">ClassSight</div>
              <div className="logo-sub">Attendance Hub</div>
            </div>
          </div>
        </div>
        <div className="sidebar-user">
          <div className="user-avatar">{initials}</div>
          <div>
            <div className="user-name">{userFullName}</div>
            <div className="user-role-badge">{userRole}</div>
          </div>
        </div>
        <div className="sidebar-nav">
          <div className="nav-section-label">Navigation</div>
          {navItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => onPageChange(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
        <div className="sidebar-footer">
          <button onClick={onLogout}>🚪 Sign Out</button>
        </div>
      </nav>

      <div className="main-content">
        <div className="top-bar">
          <div>
            <div className="page-title">
              {navItems.find(n => n.id === currentPage)?.label ?? 'Dashboard'}
            </div>
            <div className="page-subtitle">
              ClassSight · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>
        <div className="content-area">{children}</div>
      </div>
    </div>
  );
}
