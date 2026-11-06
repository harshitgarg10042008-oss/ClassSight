export type RouteKind = 'WIRED' | 'STATIC';

export const routes = [
  { path: '/', purpose: 'Marketing home', kind: 'STATIC' as RouteKind },
  { path: '/pricing', purpose: 'Plans and pricing', kind: 'STATIC' as RouteKind },
  { path: '/privacy', purpose: 'Privacy draft', kind: 'STATIC' as RouteKind },
  { path: '/terms', purpose: 'Terms draft', kind: 'STATIC' as RouteKind },
  { path: '/app', purpose: 'Faculty workspace', kind: 'WIRED' as RouteKind },
  { path: '/app/enrollment', purpose: 'Enrollment', kind: 'WIRED' as RouteKind },
  { path: '/app/analytics', purpose: 'Analytics', kind: 'WIRED' as RouteKind },
  { path: '/app/student', purpose: 'Student portal', kind: 'WIRED' as RouteKind },
  { path: '/app/hod', purpose: 'HOD review', kind: 'WIRED' as RouteKind },
  { path: '/app/teacher', purpose: 'Teacher capture', kind: 'WIRED' as RouteKind },
  { path: '/admin', purpose: 'Institution admin demo', kind: 'STATIC' as RouteKind },
  { path: '/owner', purpose: 'Platform owner demo', kind: 'STATIC' as RouteKind },
];
