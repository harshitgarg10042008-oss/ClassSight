'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { site } from '@/config/site';
import { ThemeToggle } from '../ui/ThemeToggle';
import { Avatar } from '../ui/NavigationAndFeedback';
import { Breadcrumbs, Crumb } from '../ui/NavigationAndFeedback';
import { CommandPalette } from './CommandPalette';
import { useApp } from '../AppContext';
import { ApiClient } from '@/lib/api';
import { Logo } from '../brand/Logo';
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

// ── Sidebar state helpers ─────────────────────────────────────────────────────
// B1 fix: separate userPreference (persisted) from autoCollapsed (viewport only)

const SIDEBAR_KEY = 'classsight-sidebar-collapsed';
const MOBILE_BREAKPOINT = 1024; // below this: off-canvas drawer, not rail

function readSidebarPref(): boolean {
  try {
    const v = localStorage.getItem(SIDEBAR_KEY);
    // B1 fix: validate; anything unexpected → fallback to expanded (false)
    if (v === 'true') return true;
    if (v === 'false') return false;
    return false; // invalid/null → expanded
  } catch {
    return false; // storage unavailable → expanded
  }
}

function writeSidebarPref(collapsed: boolean) {
  try {
    localStorage.setItem(SIDEBAR_KEY, String(collapsed));
  } catch {}
}

// ── Route → breadcrumb map ────────────────────────────────────────────────────
// B4 fix: derive breadcrumbs from pathname so they always match the page

const ROUTE_LABELS: { pattern: RegExp; label: string }[] = [
  { pattern: /^\/app\/teacher(\/.*)?$/,    label: 'Take Attendance'  },
  { pattern: /^\/app\/today$/,             label: 'Today'            },
  { pattern: /^\/app\/review$/,            label: 'Review Queue'     },
  { pattern: /^\/app\/sessions(\/.*)?$/,   label: 'Sessions'         },
  { pattern: /^\/app\/classes(\/.*)?$/,    label: 'Classes'          },
  { pattern: /^\/app\/enrollment$/,        label: 'Enrollment'       },
  { pattern: /^\/app\/students(\/.*)?$/,   label: 'Students'         },
  { pattern: /^\/app\/timetable$/,         label: 'Timetable'        },
  { pattern: /^\/app\/cameras$/,           label: 'Cameras'          },
  { pattern: /^\/app\/analytics(\/.*)?$/,  label: 'Analytics'        },
  { pattern: /^\/app\/reports$/,           label: 'Reports'          },
  { pattern: /^\/app\/risk$/,              label: 'Risk Radar'       },
  { pattern: /^\/app\/leave$/,             label: 'Leave'            },
  { pattern: /^\/app\/disputes$/,          label: 'Disputes'         },
  { pattern: /^\/app\/notifications$/,     label: 'Notifications'    },
  { pattern: /^\/app\/settings(\/.*)?$/,   label: 'Settings'         },
  { pattern: /^\/app\/help$/,              label: 'Help'             },
  { pattern: /^\/app\/hod(\/.*)?$/,        label: 'HOD Dashboard'    },
  { pattern: /^\/app\/student(\/.*)?$/,    label: 'My Attendance'    },
  { pattern: /^\/app$/,                    label: 'Dashboard'        },
];

function routeLabel(pathname: string): string {
  for (const { pattern, label } of ROUTE_LABELS) {
    if (pattern.test(pathname)) return label;
  }
  return 'Workspace';
}

function derivecrumbs(pathname: string): Crumb[] {
  if (pathname === '/app') return [{ label: 'Workspace' }];
  const label = routeLabel(pathname);
  return [{ label: 'Workspace', href: '/app' }, { label }];
}

// ── Component ─────────────────────────────────────────────────────────────────

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
    language,
    toggleLanguage,
    notifications,
    unreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    setCommandPaletteOpen,
    isDev,
  } = useApp();

  // B1 fix: userPreference (persisted in localStorage, validated on read)
  const [userPrefCollapsed, setUserPrefCollapsed] = useState(false);
  // B1 fix: autoCollapsed (derived from viewport, never persisted)
  const [isMobile, setIsMobile] = useState(false);
  // Mobile off-canvas drawer
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread'>('all');
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement | null>(null);
  const notifRef = useRef<HTMLDivElement | null>(null);

  // Hydrate sidebar preference from localStorage (client-only)
  useEffect(() => {
    setUserPrefCollapsed(readSidebarPref());
  }, []);

  // B1 fix: Track viewport width for auto-collapse
  useEffect(() => {
    function checkMobile() {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    }
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // B1 fix: collapsed = userPref AND not mobile (mobile uses drawer instead)
  const collapsed = !isMobile && userPrefCollapsed;

  function toggleCollapsed() {
    const next = !userPrefCollapsed;
    setUserPrefCollapsed(next);
    writeSidebarPref(next);
  }

  // B1 fix: "[" key shortcut to toggle sidebar
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
      if (e.key === '[') {
        e.preventDefault();
        if (isMobile) {
          setMobileDrawerOpen((o) => !o);
        } else {
          toggleCollapsed();
        }
      }
      if (e.key === '?' && !e.shiftKey) {
        e.preventDefault();
        setShortcutsModalOpen((prev) => !prev);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, userPrefCollapsed]);

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

  // Sidebar navigation
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

  // B4 fix: breadcrumbs derived from pathname unless explicitly supplied
  const resolvedCrumbs: Crumb[] = crumbs ?? derivecrumbs(pathname);

  const filteredNotifications = notifications.filter((n) =>
    notifFilter === 'unread' ? !n.read : true
  );

  // ── Sidebar inner content ───────────────────────────────────────────────────
  const sidebarNav = (
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
                // B1 fix: tooltip on collapsed items
                title={collapsed ? item.label : undefined}
                // B1 fix: aria-label for collapsed icon-only links
                aria-label={collapsed ? item.label : undefined}
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
  );

  // ── Main sidebar element ────────────────────────────────────────────────────
  const sidebar = (
    <aside
      className={`cs-app-sidebar ${collapsed ? 'is-collapsed' : ''} ${mobileDrawerOpen ? 'is-mobile-open' : ''}`}
      aria-label="Faculty Navigation"
    >
      {/* B3 fix: use Logo component instead of old "C" tile */}
      <div className="cs-sidebar-header">
        <Link
          href="/app"
          className="cs-brand-link"
          onClick={() => setMobileDrawerOpen(false)}
          aria-label="ClassSight — go to dashboard"
        >
          {collapsed ? (
            /* B1 fix: clicking mark in collapsed rail expands sidebar */
            <span
              onClick={(e) => { e.preventDefault(); toggleCollapsed(); }}
              style={{ cursor: 'pointer', display: 'flex' }}
              role="button"
              aria-label="Expand sidebar"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCollapsed(); } }}
            >
              <Logo variant="mark" tone="auto" size={28} decorative />
            </span>
          ) : (
            <Logo variant="lockup" tone="auto" size={28} decorative />
          )}
        </Link>
        {/* B1 fix: toggle button always visible in sidebar header */}
        <button
          type="button"
          className="cs-sidebar-collapse-btn"
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          title={`${collapsed ? 'Expand' : 'Collapse'} sidebar ([)`}
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

      {/* B5 fix: only the nav list scrolls */}
      {sidebarNav}

      {/* Sidebar Footer — pinned */}
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
      {sidebar}

      {/* ── Main Content Area ──────────────────────────────────────────────── */}
      <div className="cs-app-main-panel">
        {/* Topbar */}
        <header className="cs-app-topbar">
          <div className="cs-topbar-left">
            {/* B1 fix: mobile menu button AND collapse toggle always reachable in topbar */}
            <button
              type="button"
              className="cs-topbar-mobile-btn"
              onClick={() => isMobile ? setMobileDrawerOpen(true) : toggleCollapsed()}
              aria-label={isMobile ? 'Open navigation menu' : (collapsed ? 'Expand sidebar' : 'Collapse sidebar')}
            >
              {isMobile ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              ) : (
                collapsed ? <ChevronRightIcon size={18} /> : <ChevronLeftIcon size={18} />
              )}
            </button>

            {/* B4 fix: breadcrumbs derived from pathname */}
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

            {/* B6 fix: Language switch — neutral "Partial" badge, no red styling */}
            <button
              type="button"
              className="cs-lang-toggle-btn"
              onClick={toggleLanguage}
              title={language === 'en'
                ? 'Switch to Hindi (partial translation)'
                : 'Switch to English'}
              aria-label={`Language: ${language === 'en' ? 'English' : 'Hindi'}. Click to switch.`}
            >
              <span className="cs-lang-code">{language === 'en' ? 'EN' : 'हिन्दी'}</span>
              <span
                className="cs-lang-partial-tag"
                title="Hindi translation is partial"
              >
                Partial
              </span>
            </button>

            {/* Theme Toggle */}
            <div className="cs-topbar-theme-wrap">
              <ThemeToggle />
            </div>

            {/* Notification Bell */}
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
                            {/* B7 fix: timestamps in cs-mono */}
                            <span className="cs-notif-item-time cs-mono">{n.timestamp}</span>
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
                    <Link href="/app/settings?tab=profile" role="menuitem" className="cs-profile-menu-item" onClick={() => setProfileOpen(false)}>
                      <UserIcon size={16} />
                      <span>My Profile</span>
                    </Link>
                    <Link href="/app/settings" role="menuitem" className="cs-profile-menu-item" onClick={() => setProfileOpen(false)}>
                      <SettingsIcon size={16} />
                      <span>Settings</span>
                    </Link>
                    <Link href="/app/settings?tab=appearance" role="menuitem" className="cs-profile-menu-item" onClick={() => setProfileOpen(false)}>
                      <span className="cs-menu-icon-wrap" aria-hidden="true">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="5" />
                          <path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
                        </svg>
                      </span>
                      <span>Appearance</span>
                    </Link>
                    {/* B1 fix: Reset layout option */}
                    <button
                      type="button"
                      role="menuitem"
                      className="cs-profile-menu-item"
                      onClick={() => {
                        try { localStorage.removeItem(SIDEBAR_KEY); } catch {}
                        setUserPrefCollapsed(false);
                        setProfileOpen(false);
                      }}
                    >
                      <span className="cs-menu-icon-wrap" aria-hidden="true">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                          <path d="M3 3v5h5" />
                        </svg>
                      </span>
                      <span>Reset layout</span>
                    </button>
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
                    <Link href="/app/help" role="menuitem" className="cs-profile-menu-item" onClick={() => setProfileOpen(false)}>
                      <HelpIcon size={16} />
                      <span>Help &amp; Support</span>
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

        {/* Development Mode Hint */}
        {isDev && (
          <div className="cs-dev-hint-banner" role="status">
            <span>ClassSight Dev Mode &bull; Mock token active &bull; All APIs routed to local backend:8080</span>
          </div>
        )}

        {/* B8 fix: Sample Data Banner */}
        {isSampleData && (
          <div className="sample-banner" role="status">
            <strong>Sample data</strong> — fictional attendance records for demonstration. No live backend state modified.
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
          <Link href="/app" className={`cs-bottom-nav-item ${pathname === '/app' ? 'is-active' : ''}`}>
            <DashboardIcon size={20} />
            <span className="cs-bottom-label">Dashboard</span>
          </Link>
          <Link href="/app/today" className={`cs-bottom-nav-item ${pathname === '/app/today' ? 'is-active' : ''}`}>
            <TodayIcon size={20} />
            <span className="cs-bottom-label">Today</span>
          </Link>
          <Link href="/app/teacher" className={`cs-bottom-nav-item cs-bottom-nav-take ${pathname === '/app/teacher' ? 'is-active' : ''}`}>
            <CameraIcon size={22} />
            <span className="cs-bottom-label">Capture</span>
          </Link>
          <Link href="/app/review" className={`cs-bottom-nav-item ${pathname === '/app/review' ? 'is-active' : ''}`}>
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
                <span>Toggle Sidebar</span>
                <span><kbd>[</kbd></span>
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
