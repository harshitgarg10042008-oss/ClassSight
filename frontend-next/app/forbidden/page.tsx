import Link from 'next/link';

export default function ForbiddenPage() {
  return <main id="main-content" className="system-page"><span className="eyebrow">403</span><h1>You do not have access to this area.</h1><Link className="button button-primary" href="/app">Open workspace</Link></main>;
}
