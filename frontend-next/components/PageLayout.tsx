import Link from 'next/link';

const links = [
  { href: '/', label: 'Teacher', pageId: 'teacher' },
  { href: '/enrollment', label: 'Enrollment', pageId: 'enrollment' },
  { href: '/analytics', label: 'Analytics', pageId: 'analytics' },
  { href: '/student', label: 'Student', pageId: 'student' },
  { href: '/hod', label: 'HOD', pageId: 'hod' },
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
        <Link href="/" className="brand">ClassSight</Link>
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
        </nav>
      </header>
      <div className="page-content">{children}</div>
    </main>
  );
}
