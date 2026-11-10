import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';

export default function ForbiddenPage() {
  return (
    <main id="main-content" className="system-page">
      <div style={{ marginBottom: 16 }}>
        <Logo variant="mark" tone="auto" size={48} />
      </div>
      <span className="eyebrow">403</span>
      <h1>You do not have access to this area.</h1>
      <Link className="button button-primary" href="/app">
        Open workspace
      </Link>
    </main>
  );
}

export const metadata = { title: 'Access denied | ClassSight' };
