'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { site } from '@/config/site';
import { ThemeToggle } from '../ui/ThemeToggle';
import { Avatar } from '../ui/NavigationAndFeedback';
import { Breadcrumbs, Crumb } from '../ui/NavigationAndFeedback';
import { WorkspaceChrome } from './WorkspaceChrome';
import { Banner } from '../ui/NavigationAndFeedback';

export type AppRole = 'teacher' | 'portal' | 'admin' | 'owner';

export interface AppShellProps {
  children: React.ReactNode;
  role?: AppRole;
  title?: string;
  crumbs?: Crumb[];
  actions?: React.ReactNode;
  isSampleData?: boolean;
}

export function AppShell({
  children,
  role = 'teacher',
  title,
  crumbs,
  actions,
  isSampleData,
}: AppShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Navigation items by role
  const navMap: Record<AppRole, { href: string; label: string; icon: string; badge?: string }[]> = {
    teacher: [
      { href: '/app', label: 'Faculty Dashboard', icon: '📊' },
      { href: '/app/enrollment', label: 'Quick Enrolment', icon: '👥' },
      { href: '/app/analytics', label: 'Class Analytics', icon: '📈' },
      { href: '/app/hod', label: 'HOD Oversight', icon: '🏛️' },
      { href: '/app/teacher/classes', label: 'Classes & Roster', icon: '📚' },
      { href: '/app/teacher/timetable', label: 'Weekly Timetable', icon: '🗓️' },
      { href: '/app/teacher/reports', label: 'Attendance Reports', icon: '📋' },
      { href: '/app/teacher/risk', label: 'Risk Radar (D10)', icon: '⚠️', badge: 'Pro' },
      { href: '/notifications', label: 'Notifications', icon: '🔔' },
    ],
    portal: [
      { href: '/portal/home', label: 'Overview', icon: '🏠' },
      { href: '/portal/subjects', label: 'My Subjects', icon: '📖' },
      { href: '/portal/attendance', label: 'Attendance Timeline', icon: '📅' },
      { href: '/portal/eligibility', label: 'Eligibility Calc (D09)', icon: '🧮', badge: 'Adv' },
      { href: '/portal/leave', label: 'Leave Requests (D15)', icon: '✉️' },
      { href: '/portal/disputes', label: 'Disputes (D16)', icon: '⚖️' },
      { href: '/portal/privacy-receipt', label: 'Privacy Receipt (D20)', icon: '🛡️' },
    ],
    admin: [
      { href: '/admin/overview', label: 'Admin Overview', icon: '🏢' },
      { href: '/admin/departments-classes', label: 'Departments & Classes', icon: '📂' },
      { href: '/admin/teachers', label: 'Faculty Directory', icon: '👨‍🏫' },
      { href: '/admin/students', label: 'Student Directory', icon: '🎓' },
      { href: '/admin/rooms-cameras', label: 'Rooms & Cameras', icon: '📹' },
      { href: '/admin/timetable', label: 'Master Timetable', icon: '🕒' },
      { href: '/admin/consent-ledger', label: 'Consent Ledger (D19)', icon: '📜' },
      { href: '/admin/billing', label: 'Plan & Usage', icon: '💳' },
      { href: '/admin/audit-log', label: 'Audit Log (FT12)', icon: '🔍' },
      { href: '/admin/integrations', label: 'ERP Dry-Run (FT14)', icon: '🔄' },
    ],
    owner: [
      { href: '/owner/overview', label: 'Platform Overview', icon: '🌐' },
      { href: '/owner/tenants', label: 'Tenants & Campuses', icon: '🏫' },
      { href: '/owner/plans-pricing', label: 'Plans & Pricing', icon: '🏷️' },
      { href: '/owner/entitlements', label: 'Entitlements Matrix', icon: '🧩' },
      { href: '/owner/feature-flags', label: 'Feature Flags', icon: '🚩' },
      { href: '/owner/system-health', label: 'System Health (FT16)', icon: '💓' },
      { href: '/owner/audit-log', label: 'Global Audit', icon: '📋' },
    ],
  };

  const navItems = navMap[role] || navMap.teacher;

  // Derive role title
  const roleDisplay = {
    teacher: 'Faculty Workspace',
    portal: 'Student & Parent Portal',
    admin: 'Institution Admin',
    owner: 'Platform Owner',
  }[role];

  const showSampleBanner = isSampleData !== undefined ? isSampleData : (role !== 'teacher');

  return (
    <div className={`cs-app-layout ${collapsed ? 'is-collapsed' : ''}`}>
      {/* Workspace Chrome overlay (Shortcuts, Help, Demo switchers) */}
      <WorkspaceChrome />

      {/* Sidebar */}
      <aside className="cs-app-sidebar" aria-label="Sidebar navigation">
        <div className="cs-sidebar-header">
          <Link href="/" className="cs-brand-link">
            <span className="cs-brand-mark">C</span>
            {!collapsed && <span className="cs-brand-name">{site.name}</span>}
          </Link>
          <button
            type="button"
            className="cs-sidebar-collapse-btn"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? '▶' : '◀'}
          </button>
        </div>

        <div className="cs-sidebar-role-indicator">
          {!collapsed && <span className="cs-sidebar-role-tag">{roleDisplay}</span>}
        </div>

        <nav className="cs-sidebar-nav" aria-label={`${roleDisplay} Navigation`}>
          {navItems.map((item) => {
            const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/app');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`cs-sidebar-link ${isActive ? 'is-active' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <span className="cs-sidebar-icon" aria-hidden="true">{item.icon}</span>
                {!collapsed && (
                  <>
                    <span className="cs-sidebar-label">{item.label}</span>
                    {item.badge && <span className="cs-sidebar-badge">{item.badge}</span>}
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="cs-sidebar-footer">
          {!collapsed && (
            <div className="cs-sidebar-user-card">
              <Avatar name={role === 'portal' ? 'Aarav Patel' : 'Dr. Sharma'} size="sm" />
              <div className="cs-sidebar-user-info">
                <span className="cs-sidebar-user-name">
                  {role === 'portal' ? 'Aarav Patel (CS-101)' : 'Dr. R. Sharma'}
                </span>
                <span className="cs-sidebar-user-role">{roleDisplay}</span>
              </div>
            </div>
          )}
          <div className="cs-sidebar-theme-row">
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="cs-app-main-panel">
        {/* Topbar */}
        <header className="cs-app-topbar">
          <div className="cs-topbar-left">
            <button
              type="button"
              className="cs-topbar-mobile-btn"
              onClick={() => setMobileMenuOpen((o) => !o)}
              aria-label="Toggle mobile menu"
            >
              ☰
            </button>
            {crumbs && crumbs.length > 0 ? (
              <Breadcrumbs crumbs={crumbs} />
            ) : (
              <span className="cs-topbar-title">{title || roleDisplay}</span>
            )}
          </div>

          <div className="cs-topbar-right">
            <div className="cs-role-switcher-dropdown">
              <select
                aria-label="Switch active workspace role"
                value={role}
                onChange={(e) => {
                  const targetRole = e.target.value;
                  const targets: Record<string, string> = {
                    teacher: '/app',
                    portal: '/portal/home',
                    admin: '/admin/overview',
                    owner: '/owner/overview',
                  };
                  window.location.href = targets[targetRole] || '/app';
                }}
                className="cs-role-select"
              >
                <option value="teacher">Faculty Workspace (Wired)</option>
                <option value="portal">Student Portal (Preview)</option>
                <option value="admin">Admin Console (Preview)</option>
                <option value="owner">Owner Console (Preview)</option>
              </select>
            </div>

            <Link href="/notifications" className="cs-topbar-icon-btn" aria-label="Notifications center">
              🔔
            </Link>

            <Link href="/login" className="cs-topbar-user-btn" aria-label="Account profile">
              <Avatar name={role === 'portal' ? 'Aarav Patel' : 'Dr. Sharma'} size="sm" />
            </Link>
          </div>
        </header>

        {/* Optional Sample Data Banner */}
        {showSampleBanner && (
          <Banner
            type="sample"
            message="Sample data view — For preview and demonstration purposes. No live backend state modified."
          />
        )}

        {/* Page Content */}
        <main id="main-content" className="cs-app-content">
          <div className="cs-app-content-container">
            {title && (
              <div className="cs-page-header">
                <div>
                  <h1 className="cs-page-title">{title}</h1>
                </div>
                {actions && <div className="cs-page-actions">{actions}</div>}
              </div>
            )}
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="cs-mobile-bottom-bar" aria-label="Quick Navigation">
          {navItems.slice(0, 4).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`cs-bottom-nav-item ${pathname === item.href ? 'is-active' : ''}`}
            >
              <span className="cs-bottom-icon">{item.icon}</span>
              <span className="cs-bottom-label">{item.label.split(' ')[0]}</span>
            </Link>
          ))}
          <Link href="/notifications" className="cs-bottom-nav-item">
            <span className="cs-bottom-icon">🔔</span>
            <span className="cs-bottom-label">Alerts</span>
          </Link>
        </nav>
      </div>
    </div>
  );
}

