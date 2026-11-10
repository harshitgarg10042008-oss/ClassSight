import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';

export default function NotFound() {
  return (
    <main id="main-content" className="system-page">
      <div style={{ marginBottom: 16 }}>
        <Logo variant="mark" tone="auto" size={48} />
      </div>
      <span className="eyebrow">404</span>
      <h1>That page is not here.</h1>
      <p>Check the address or return to the ClassSight home.</p>
      <Link className="button button-primary" href="/">
        Return home
      </Link>
    </main>
  );
}
