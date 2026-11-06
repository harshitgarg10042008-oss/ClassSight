import Link from 'next/link';

export default function NotFound() {
  return <main id="main-content" className="system-page"><span className="eyebrow">404</span><h1>That page is not here.</h1><p>Check the address or return to the ClassSight home.</p><Link className="button button-primary" href="/">Return home</Link></main>;
}
