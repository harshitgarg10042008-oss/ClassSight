'use client';

import { Logo } from '@/components/brand/Logo';

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main-content" className="system-page">
      <div style={{ marginBottom: 16 }}>
        <Logo variant="mark" tone="auto" size={48} />
      </div>
      <span className="eyebrow">Something went wrong</span>
      <h1>We could not load this page.</h1>
      <button className="button button-primary" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
