'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { site } from '@/config/site';
import { ThemeToggle } from '../ui/ThemeToggle';
import { Avatar } from '../ui/NavigationAndFeedback';
import { Breadcrumbs, Crumb } from '../ui/NavigationAndFeedback';
import { CommandPalette } from './CommandPalette';
import { useApp } from '../AppContext';
import { ApiClient } from '@/lib/api';
import {
  DashboardIcon,
  TodayIcon,
  CameraIcon,
  ReviewIcon,
  SessionsIcon,
  ClassesIcon,
  EnrollIcon,
  StudentsIcon,
  TimetableIcon,
  CamerasIcon,
  AnalyticsIcon,
  ReportsIcon,
  RiskIcon,
  LeaveIcon,
  DisputesIcon,
  BellIcon,
  SettingsIcon,
  HelpIcon,
  SearchIcon,
  SignOutIcon,
  LockIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  UserIcon,
  CheckIcon,
  KbdIcon,
} from '../ui/Icons';

export interface NavLinkItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  badgeTone?: 'blue' | 'amber' | 'green' | 'purple';
  planGate?: 'Pro' | 'Advanced';
}

export interface NavGroup {
  name: string;
  items: NavLinkItem[];
}

export interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  crumbs?: Crumb[];
  actions?: React.ReactNode;
  isSampleData?: boolean;
}

export function AppShell({
  children,
  title,
  crumbs,
  actions,
  isSampleData = false,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    user,
    setUser,
    language,
    toggleLanguage,
    notifications,
    unreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    setCommandPaletteOpen,
    isDev,
  } = useApp();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread'>('all');
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement | null>(null);
  const notifRef = useRef<HTMLDivElement | null>(null);

  // Restore collapsed state
  useEffect(() => {
    try {
      const stored = localStorage.getItem('classsight-sidebar-collapsed');
      if (stored === 'true') setCollapsed(true);
    } catch {}
  }, []);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem('classsight-sidebar-collapsed', String(next));
    } catch {}
  }

  // Click outside listener for dropdown menus
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut: Shift+? for shortcuts modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setShortcutsModalOpen((prev) => !prev);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  function handleSignOut() {
    try {
      new ApiClient().clearToken();
      localStorage.removeItem('classsight_token');
      localStorage.removeItem('classsight_full_name');
      localStorage.removeItem('classsight_role');
      localStorage.removeItem('classsight_username');
    } catch {}
    router.push('/login');
  }

  // Sidebar navigation grouped according to prompt spec
  const navGroups: NavGroup[] = [
    {
      name: 'Workspace',
      items: [
        { href: '/app', label: 'Dashboard', icon: <DashboardIcon size={18} /> },
        { href: '/app/today', label: 'Today', icon: <TodayIcon size={18} /> },
        { href: '/app/teacher', label: 'Take Attendance', icon: <CameraIcon size={18} /> },
        {
          href: '/app/review',
          label: 'Review queue',
          icon: <ReviewIcon size={18} />,
          badge: '1',
          badgeTone: 'amber',
        },
        { href: '/app/sessions', label: 'Sessions', icon: <SessionsIcon size={18} /> },
      ],
    },
    {
      name: 'Classes',
      items: [
        { href: '/app/classes', label: 'Classes', icon: <ClassesIcon size={18} /> },
        { href: '/app/enrollment', label: 'Enrollment', icon: <EnrollIcon size={18} /> },
        { href: '/app/students', label: 'Students', icon: <StudentsIcon size={18} /> },
        { href: '/app/timetable', label: 'Timetable', icon: <TimetableIcon size={18} /> },
        { href: '/app/cameras', label: 'Cameras', icon: <CamerasIcon size={18} /> },
      ],
    },
    {
      name: 'Insights',
      items: [
        { href: '/app/analytics', label: 'Analytics', icon: <AnalyticsIcon size={18} /> },
        { href: '/app/reports', label: 'Reports', icon: <ReportsIcon size={18} /> },
        {
          href: '/app/risk',
          label: 'Risk Radar',
          icon: <RiskIcon size={18} />,
          badge: 'Pro',
          badgeTone: 'purple',
          planGate: 'Pro',
        },
      ],
    },
    {
      name: 'Requests',
      items: [
        {
          href: '/app/leave',
          label: 'Leave',
          icon: <LeaveIcon size={18} />,
          badge: 'Adv',
          badgeTone: 'purple',
          planGate: 'Advanced',
        },
        { href: '/app/disputes', label: 'Disputes', icon: <DisputesIcon size={18} /> },
      ],
    },
    {
      name: 'Account',
      items: [
        {
          href: '/app/notifications',
          label: 'Notifications',
          icon: <BellIcon size={18} />,
          badge: unreadCount > 0 ? String(unreadCount) : undefined,
          badgeTone: 'blue',
        },
        { href: '/app/settings', label: 'Settings', icon: <SettingsIcon size={18} /> },
        { href: '/app/help', label: 'Help', icon: <HelpIcon size={18} /> },
      ],
    },
  ];

  // Derive active breadcrumbs if not supplied
  const resolvedCrumbs: Crumb[] = crumbs || [
    { label: 'Workspace', href: '/app' },
    { label: title || 'Faculty App' },
  ];

  const filteredNotifications = notifications.filter((n) =>
    notifFilter === 'unread' ? !n.read : true
  );

  return (
    <div className={`cs-app-layout ${collapsed ? 'is-collapsed' : ''}`}>
      {/* Global Command Palette */}
      <CommandPalette />

      {/* Mobile Drawer Overlay */}
      {mobileDrawerOpen && (
        <div
          className="cs-mobile-backdrop"
          onClick={() => setMobileDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <aside
        className={`cs-app-sidebar ${mobileDrawerOpen ? 'is-mobile-open' : ''}`}
        aria-label="Faculty Navigation"
      >
        <div className="cs-sidebar-header">
          <Link href="/app" className="cs-brand-link" onClick={() => setMobileDrawerOpen(false)}>
            <span className="cs-brand-mark">C</span>
            {!collapsed && (
              <div className="cs-brand-text-block">
                <span className="cs-brand-name">{site.name}</span>
                <span className="cs-brand-sub">Attendance Hub</span>
              </div>
            )}
          </Link>
          <button
            type="button"
            className="cs-sidebar-collapse-btn"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRightIcon size={16} /> : <ChevronLeftIcon size={16} />}
          </button>
        </div>

        <div className="cs-sidebar-role-indicator">
          {!collapsed && (
            <div className="cs-role-badge-row">
              <span className="cs-sidebar-role-tag">Faculty Workspace</span>
              {isDev && <span className="cs-dev-pill" title="NODE_ENV is development">DEV</span>}
            </div>
          )}
        </div>

        {/* Grouped Navigation */}
        <nav className="cs-sidebar-nav" aria-label="Interior Sections">
          {navGroups.map((group) => (
            <div key={group.name} className="cs-sidebar-group">
              {!collapsed && <div className="cs-sidebar-group-title">{group.name}</div>}
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/app' && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`cs-sidebar-link ${isActive ? 'is-active' : ''}`}
                    title={collapsed ? `${item.label}${item.planGate ? ` (${item.planGate})` : ''}` : undefined}
                    onClick={() => setMobileDrawerOpen(false)}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span className="cs-sidebar-icon" aria-hidden="true">
                      {item.icon}
                    </span>
                    {!collapsed && (
                      <>
                        <span className="cs-sidebar-label">{item.label}</span>
                        {item.planGate && (
                          <span className="cs-lock-indicator" title={`Available on ${item.planGate} plan`}>
                            <LockIcon size={12} />
                          </span>
                        )}
                        {item.badge && (
                          <span
                            className={`cs-sidebar-badge ${
                              item.badgeTone ? `tone-${item.badgeTone}` : ''
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="cs-sidebar-footer">
          {!collapsed && (
            <div className="cs-sidebar-user-card">
              <Avatar name={user.fullName} size="sm" />
              <div className="cs-sidebar-user-info">
                <span className="cs-sidebar-user-name">{user.fullName}</span>
                <span className="cs-sidebar-user-role">{user.role}</span>
              </div>
            </div>
          )}
          <div className="cs-sidebar-footer-actions">
            <button
              type="button"
              className="cs-quick-palette-trigger"
              onClick={() => setCommandPaletteOpen(true)}
              title="Search and shortcuts (Ctrl+K)"
              aria-label="Open command palette"
            >
              <KbdIcon size={16} />
              {!collapsed && <span>Ctrl+K</span>}
            </button>
            <div className="cs-theme-holder">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Content Area ──────────────────────────────────────────────── */}
      <div className="cs-app-main-panel">
        {/* Topbar */}
        <header className="cs-app-topbar">
          <div className="cs-topbar-left">
            <button
              type="button"
              className="cs-topbar-mobile-btn"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Open navigation menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            {/* Breadcrumbs */}
            <Breadcrumbs crumbs={resolvedCrumbs} />
          </div>

          <div className="cs-topbar-center">
            {/* Global Search / Command Palette Bar */}
            <button
              type="button"
              className="cs-topbar-search-btn"
              onClick={() => setCommandPaletteOpen(true)}
              aria-label="Open global search and command palette"
            >
              <SearchIcon size={16} />
              <span className="cs-search-placeholder">Search pages, classes, actions...</span>
              <kbd className="cs-search-kbd">Ctrl+K</kbd>
            </button>
          </div>

          <div className="cs-topbar-right">
            {/* Quick "Take attendance" button */}
            <Link
              href="/app/teacher"
              className="cs-topbar-quick-take-btn button-primary cs-button"
              title="Open camera to capture attendance"
            >
              <CameraIcon size={16} />
              <span className="cs-quick-take-text">Take attendance</span>
            </Link>

            {/* English / Hindi Language Switch (Marked Partial) */}
            <button
              type="button"
              className="cs-lang-toggle-btn"
              onClick={toggleLanguage}
              title={`Switch language. Currently ${language.toUpperCase()} (आंशिक / Partial localization)`}
              aria-label={`Language switch: current ${language === 'en' ? 'English' : 'Hindi'}`}
            >
              <span className="cs-lang-code">{language === 'en' ? 'EN' : 'हिन्दी'}</span>
              <span className="cs-lang-partial-tag" title="Partial localization">आंशिक</span>
            </button>

            {/* Persisted Theme Toggle (Sun/Moon SVG) */}
            <div className="cs-topbar-theme-wrap">
              <ThemeToggle />
            </div>

            {/* Notification Bell with Dropdown */}
            <div className="cs-notif-dropdown-wrap" ref={notifRef}>
              <button
                type="button"
                className="cs-topbar-icon-btn"
                onClick={() => setNotificationsOpen((o) => !o)}
                aria-label={`Notifications: ${unreadCount} unread`}
                aria-expanded={notificationsOpen}
              >
                <BellIcon size={18} />
                {unreadCount > 0 && (
                  <span className="cs-notif-badge tabular-nums">{unreadCount}</span>
                )}
              </button>

              {notificationsOpen && (
                <div className="cs-notif-dropdown" role="region" aria-label="Notifications Panel">
                  <div className="cs-notif-dropdown-head">
                    <div className="cs-notif-head-title">
                      <span>Notifications</span>
                      {unreadCount > 0 && (
                        <span className="cs-notif-unread-pill">{unreadCount} new</span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        className="cs-notif-mark-all"
                        onClick={markAllNotificationsRead}
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className="cs-notif-filter-tabs">
                    <button
                      type="button"
                      className={`cs-notif-filter-tab ${notifFilter === 'all' ? 'is-active' : ''}`}
                      onClick={() => setNotifFilter('all')}
                    >
                      All ({notifications.length})
                    </button>
                    <button
                      type="button"
                      className={`cs-notif-filter-tab ${notifFilter === 'unread' ? 'is-active' : ''}`}
                      onClick={() => setNotifFilter('unread')}
                    >
                      Unread ({unreadCount})
                    </button>
                  </div>

                  <div className="cs-notif-list">
                    {filteredNotifications.length === 0 ? (
                      <div className="cs-notif-empty">No notifications right now</div>
                    ) : (
                      filteredNotifications.map((n) => (
                        <div
                          key={n.id}
                          className={`cs-notif-item ${!n.read ? 'is-unread' : ''}`}
                          onClick={() => {
                            markNotificationRead(n.id);
                            if (n.link) {
                              setNotificationsOpen(false);
                              router.push(n.link);
                            }
                          }}
                        >
                          <div className="cs-notif-item-body">
                            <div className="cs-notif-item-title">
                              {!n.read && <span className="cs-notif-dot" aria-hidden="true" />}
                              <span>{n.title}</span>
                            </div>
                            <div className="cs-notif-item-desc">{n.description}</div>
                            <span className="cs-notif-item-time">{n.timestamp}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="cs-notif-dropdown-foot">
                    <Link
                      href="/app/notifications"
                      onClick={() => setNotificationsOpen(false)}
                      className="cs-notif-view-all"
                    >
                      View all notifications →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Menu Dropdown */}
            <div className="cs-profile-dropdown-wrap" ref={profileRef}>
              <button
                type="button"
                className="cs-topbar-user-btn"
                onClick={() => setProfileOpen((o) => !o)}
                aria-label="User account and profile menu"
                aria-expanded={profileOpen}
              >
                <Avatar name={user.fullName} size="sm" />
                <span className="cs-user-pill-name">{user.fullName.split(' ')[0]}</span>
              </button>

              {profileOpen && (
                <div className="cs-profile-dropdown" role="menu" aria-label="Profile actions">
                  <div className="cs-profile-header">
                    <Avatar name={user.fullName} size="md" />
                    <div className="cs-profile-details">
                      <span className="cs-profile-name">{user.fullName}</span>
                      <span className="cs-profile-role-badge">{user.role}</span>
                      <span className="cs-profile-email">teacher@institution.edu</span>
                    </div>
                  </div>

                  <div className="cs-profile-menu-links">
                    <Link
                      href="/app/settings?tab=profile"
                      role="menuitem"
                      className="cs-profile-menu-item"
                      onClick={() => setProfileOpen(false)}
                    >
                      <UserIcon size={16} />
                      <span>My Profile</span>
                    </Link>
                    <Link
                      href="/app/settings"
                      role="menuitem"
                      className="cs-profile-menu-item"
                      onClick={() => setProfileOpen(false)}
                    >
                      <SettingsIcon size={16} />
                      <span>Settings</span>
                    </Link>
                    <Link
                      href="/app/settings?tab=appearance"
                      role="menuitem"
                      className="cs-profile-menu-item"
                      onClick={() => setProfileOpen(false)}
                    >
                      <span className="cs-menu-icon-wrap" aria-hidden="true">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="5" />
                          <path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
                        </svg>
                      </span>
                      <span>Appearance</span>
                    </Link>
                    <button
                      type="button"
                      role="menuitem"
                      className="cs-profile-menu-item"
                      onClick={() => {
                        setProfileOpen(false);
                        setShortcutsModalOpen(true);
                      }}
                    >
                      <KbdIcon size={16} />
                      <span>Keyboard shortcuts</span>
                      <kbd className="cs-menu-kbd">?</kbd>
                    </button>
                    <Link
                      href="/app/help"
                      role="menuitem"
                      className="cs-profile-menu-item"
                      onClick={() => setProfileOpen(false)}
                    >
                      <HelpIcon size={16} />
                      <span>Help & Support</span>
                    </Link>
                  </div>

                  <div className="cs-profile-menu-foot">
                    <button
                      type="button"
                      role="menuitem"
                      className="cs-profile-signout-btn"
                      onClick={handleSignOut}
                    >
                      <SignOutIcon size={16} />
                      <span>Sign out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Development Mode Hint (shown strictly when NODE_ENV === 'development') */}
        {isDev && (
          <div className="cs-dev-hint-banner" role="status">
            <span>ClassSight Dev Mode &bull; Mock token active &bull; All APIs routed to local backend:8080</span>
          </div>
        )}

        {/* Optional Fictional Sample Data Banner */}
        {isSampleData && (
          <div className="sample-banner" role="status">
            <strong>Sample data</strong> Preview mode &mdash; fictional attendance records for demonstration. No live backend state modified.
          </div>
        )}

        {/* Main Content Area */}
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
        <nav className="cs-mobile-bottom-bar" aria-label="Mobile Bottom Navigation">
          <Link
            href="/app"
            className={`cs-bottom-nav-item ${pathname === '/app' ? 'is-active' : ''}`}
          >
            <DashboardIcon size={20} />
            <span className="cs-bottom-label">Dashboard</span>
          </Link>
          <Link
            href="/app/today"
            className={`cs-bottom-nav-item ${pathname === '/app/today' ? 'is-active' : ''}`}
          >
            <TodayIcon size={20} />
            <span className="cs-bottom-label">Today</span>
          </Link>
          <Link
            href="/app/teacher"
            className={`cs-bottom-nav-item cs-bottom-nav-take ${
              pathname === '/app/teacher' ? 'is-active' : ''
            }`}
          >
            <CameraIcon size={22} />
            <span className="cs-bottom-label">Capture</span>
          </Link>
          <Link
            href="/app/review"
            className={`cs-bottom-nav-item ${pathname === '/app/review' ? 'is-active' : ''}`}
          >
            <ReviewIcon size={20} />
            <span className="cs-bottom-label">Review</span>
          </Link>
          <button
            type="button"
            className="cs-bottom-nav-item"
            onClick={() => setMobileDrawerOpen(true)}
            aria-label="More navigation links"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="1" />
              <circle cx="19" cy="12" r="1" />
              <circle cx="5" cy="12" r="1" />
            </svg>
            <span className="cs-bottom-label">More</span>
          </button>
        </nav>
      </div>

      {/* Keyboard Shortcuts Modal */}
      {shortcutsModalOpen && (
        <div
          className="cs-palette-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cs-shortcuts-title"
          onClick={() => setShortcutsModalOpen(false)}
        >
          <div className="cs-shortcuts-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cs-shortcuts-head">
              <h2 id="cs-shortcuts-title">Keyboard Shortcuts</h2>
              <button
                type="button"
                className="cs-palette-close-btn"
                onClick={() => setShortcutsModalOpen(false)}
                aria-label="Close shortcuts modal"
              >
                &times;
              </button>
            </div>
            <div className="cs-shortcuts-body">
              <div className="cs-shortcut-row">
                <span>Open Command Palette</span>
                <span><kbd>Ctrl</kbd> + <kbd>K</kbd></span>
              </div>
              <div className="cs-shortcut-row">
                <span>Show Keyboard Shortcuts</span>
                <span><kbd>?</kbd></span>
              </div>
              <div className="cs-shortcut-row">
                <span>Navigate Tabs</span>
                <span><kbd>←</kbd> <kbd>→</kbd></span>
              </div>
              <div className="cs-shortcut-row">
                <span>Close Modals / Overlays</span>
                <span><kbd>Esc</kbd></span>
              </div>
              <div className="cs-shortcut-row">
                <span>Toggle Theme Mode</span>
                <span><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>D</kbd></span>
              </div>
            </div>
            <div className="cs-shortcuts-foot">
              <button
                type="button"
                className="button-secondary cs-button"
                onClick={() => setShortcutsModalOpen(false)}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
