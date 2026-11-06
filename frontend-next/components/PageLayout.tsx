import Link from 'next/link';

const links = [
  { href: '/app', label: 'Teacher', pageId: 'teacher' },
  { href: '/app/enrollment', label: 'Enrollment', pageId: 'enrollment' },
  { href: '/app/analytics', label: 'Analytics', pageId: 'analytics' },
  { href: '/app/student', label: 'Student', pageId: 'student' },
  { href: '/app/hod', label: 'HOD', pageId: 'hod' },
];

export function PageLayout({
  pageId,
  children,
}: {
  pageId: string;
  children: React.ReactNode;
}) {
  return (
    <main className="app-shell">
      <header className="topbar">
        <Link href="/app" className="brand">ClassSight</Link>
        <nav aria-label="Primary navigation">
          {links.map((link) => (
            <Link
              key={link.pageId}
              href={link.href}
              className={link.pageId === pageId ? 'active' : undefined}
            >
              {link.label}
            </Link>
          ))}
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/">Product site</Link>
        </nav>
      </header>
      <div className="page-content">{children}</div>
    </main>
  );
}
