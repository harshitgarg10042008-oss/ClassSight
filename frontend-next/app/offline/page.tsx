import Link from 'next/link';

export default function OfflinePage() {
  return <main id="main-content" className="system-page"><span className="eyebrow">Offline</span><h1>Your connection is unavailable.</h1><p>Reconnect to continue working with live attendance data.</p><Link className="button button-outline" href="/">Return home</Link></main>;
}

export const metadata = { title: 'You are offline | ClassSight' };
