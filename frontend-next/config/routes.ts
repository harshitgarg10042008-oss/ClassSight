export type RouteKind = 'WIRED' | 'STATIC' | 'UI-PREVIEW';

export type Route = { path: string; purpose: string; kind: RouteKind };

// Section routes are generated so the manifest cannot drift from the workspace registries.
function section(base: string, ids: string[], purpose: string): Route[] {
  return ids.map((id) => ({ path: `${base}/${id}`, purpose: `${purpose}: ${id.replaceAll('-', ' ')}`, kind: 'UI-PREVIEW' as RouteKind }));
}

const adminIds = [
  'overview', 'teachers', 'students', 'classes', 'departments-classes', 'users-roles', 'rooms-cameras',
  'timetable', 'plan-usage', 'billing', 'integrations', 'audit-log', 'consent-ledger', 'privacy-consent',
  'data-requests', 'notifications', 'branding', 'security', 'support', 'profile',
];

const ownerIds = [
  'overview', 'tenants', 'plans-pricing', 'entitlements', 'feature-flags', 'subscriptions-invoices',
  'revenue', 'support', 'announcements', 'audit-log', 'system-health',
];

const tenantIds = ['t-001', 't-002', 't-003', 't-004', 't-005'];

const teacherIds = [
  'today', 'classes', 'sessions', 'students', 'reports', 'risk', 'leave', 'disputes', 'timetable',
  'cameras', 'notifications', 'settings', 'analytics', 'integrations', 'help',
];

const portalIds = [
  'home', 'subjects', 'attendance', 'eligibility', 'privacy-receipt', 'timetable', 'reports',
  'notifications', 'help',
];

export const routes: Route[] = [
  { path: '/', purpose: 'Marketing home', kind: 'STATIC' },
  { path: '/features', purpose: 'Product features', kind: 'STATIC' },
  { path: '/features/FT01', purpose: 'Feature detail', kind: 'STATIC' },
  { path: '/features/FT05', purpose: 'Feature detail', kind: 'STATIC' },
  { path: '/features/FT12', purpose: 'Feature detail', kind: 'STATIC' },
  { path: '/dev/ui', purpose: 'UI kitchen sink', kind: 'STATIC' },
  { path: '/how-it-works', purpose: 'Workflow', kind: 'STATIC' },
  { path: '/solutions', purpose: 'Solutions', kind: 'STATIC' },
  { path: '/solutions/colleges', purpose: 'College solution', kind: 'STATIC' },
  { path: '/solutions/schools', purpose: 'School solution', kind: 'STATIC' },
  { path: '/solutions/coaching', purpose: 'Coaching solution', kind: 'STATIC' },
  { path: '/pricing', purpose: 'Plans and pricing', kind: 'STATIC' },
  { path: '/security', purpose: 'Trust centre', kind: 'STATIC' },
  { path: '/trust', purpose: 'Trust centre alias', kind: 'STATIC' },
  { path: '/integrations', purpose: 'Integration preview', kind: 'STATIC' },
  { path: '/contact', purpose: 'Contact form', kind: 'STATIC' },
  { path: '/book-demo', purpose: 'Demo request', kind: 'STATIC' },
  { path: '/faq', purpose: 'Frequently asked questions', kind: 'STATIC' },
  { path: '/docs', purpose: 'Documentation preview', kind: 'STATIC' },
  { path: '/accessibility', purpose: 'Accessibility statement', kind: 'STATIC' },
  { path: '/status', purpose: 'System status', kind: 'STATIC' },
  { path: '/about', purpose: 'About', kind: 'STATIC' },
  { path: '/resources', purpose: 'Resources', kind: 'STATIC' },
  { path: '/changelog', purpose: 'Changelog', kind: 'STATIC' },
  { path: '/sitemap', purpose: 'Human sitemap', kind: 'STATIC' },
  { path: '/privacy', purpose: 'Privacy draft', kind: 'STATIC' },
  { path: '/terms', purpose: 'Terms draft', kind: 'STATIC' },
  { path: '/cookies', purpose: 'Cookies draft', kind: 'STATIC' },
  { path: '/dpa', purpose: 'DPA draft', kind: 'STATIC' },
  { path: '/refund', purpose: 'Refund draft', kind: 'STATIC' },
  { path: '/acceptable-use', purpose: 'Acceptable use draft', kind: 'STATIC' },
  { path: '/student-data-notice', purpose: 'Student data draft', kind: 'STATIC' },
  { path: '/login', purpose: 'Wired login', kind: 'WIRED' },
  { path: '/signup', purpose: 'Signup preview', kind: 'STATIC' },
  { path: '/forgot-password', purpose: 'Password reset preview', kind: 'STATIC' },
  { path: '/reset-password', purpose: 'Password reset preview', kind: 'STATIC' },
  { path: '/verify-email', purpose: 'Email verification preview', kind: 'STATIC' },
  { path: '/accept-invite', purpose: 'Invite preview', kind: 'STATIC' },
  { path: '/two-factor', purpose: 'Two-factor preview', kind: 'STATIC' },
  { path: '/logout', purpose: 'Logout preview', kind: 'STATIC' },
  { path: '/onboarding', purpose: 'Onboarding checklist', kind: 'STATIC' },
  { path: '/forbidden', purpose: '403 state', kind: 'STATIC' },
  { path: '/maintenance', purpose: 'Maintenance state', kind: 'STATIC' },
  { path: '/offline', purpose: 'Offline state', kind: 'STATIC' },
  { path: '/upgrade-required', purpose: 'Plan gate state', kind: 'STATIC' },
  { path: '/notifications', purpose: 'Notification centre', kind: 'UI-PREVIEW' },
  { path: '/app', purpose: 'Faculty workspace', kind: 'WIRED' },
  { path: '/app/enrollment', purpose: 'Enrollment', kind: 'WIRED' },
  { path: '/app/analytics', purpose: 'Analytics', kind: 'WIRED' },
  { path: '/app/student', purpose: 'Student portal', kind: 'WIRED' },
  { path: '/app/hod', purpose: 'HOD review', kind: 'WIRED' },
  { path: '/app/teacher', purpose: 'Teacher capture', kind: 'WIRED' },
  { path: '/portal', purpose: 'Student and parent portal', kind: 'UI-PREVIEW' },
  { path: '/admin', purpose: 'Institution admin demo', kind: 'UI-PREVIEW' },
  { path: '/owner', purpose: 'Platform owner demo', kind: 'UI-PREVIEW' },
  ...section('/admin', adminIds, 'Institution admin'),
  ...section('/owner', ownerIds, 'Owner console'),
  ...tenantIds.map((id) => ({ path: `/owner/tenants/${id}`, purpose: `Tenant detail: ${id}`, kind: 'UI-PREVIEW' as RouteKind })),
  ...section('/portal', portalIds, 'Portal'),
  ...section('/app/teacher', teacherIds, 'Faculty workspace'),
];

export const notFoundProbe = '/this-route-does-not-exist';
