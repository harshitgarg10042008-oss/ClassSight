import Link from 'next/link';
import { site } from '@/config/site';
import { ThemeToggle } from './ui/ThemeToggle';

export function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="marketing-shell">
      <header className="marketing-header">
        <Link className="marketing-brand" href="/"><span className="brand-mark">C</span> {site.name}</Link>
        <nav aria-label="Marketing navigation" className="marketing-nav">
          {site.navigation.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
          <ThemeToggle />
          <Link className="button button-primary" href="/login">Open workspace</Link>
        </nav>
      </header>
      {children}
      <footer className="marketing-footer">
        <strong>{site.name}</strong>
        <span>{site.tagline}</span>
        <span>Privacy by design. Draft product experience.</span>
        <nav aria-label="Footer navigation">{site.footer.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}</nav>
      </footer>
    </div>
  );
}
