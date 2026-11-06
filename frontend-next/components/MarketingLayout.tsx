import Link from 'next/link';

export function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="marketing-shell">
      <header className="marketing-header">
        <Link className="marketing-brand" href="/"><span className="brand-mark">C</span> ClassSight</Link>
        <nav aria-label="Marketing navigation" className="marketing-nav">
          <Link href="/#how-it-works">How it works</Link>
          <Link href="/pricing">Plans</Link>
          <Link href="/privacy">Privacy</Link>
          <Link className="button button-primary" href="/app">Open workspace</Link>
        </nav>
      </header>
      {children}
      <footer className="marketing-footer">
        <strong>ClassSight</strong>
        <span>Attendance from one photo of the class.</span>
        <span>Privacy by design. Draft product experience.</span>
      </footer>
    </div>
  );
}
