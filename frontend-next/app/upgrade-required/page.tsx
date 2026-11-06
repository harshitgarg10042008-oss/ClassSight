import Link from 'next/link';

export default function UpgradeRequiredPage() {
  return <main id="main-content" className="system-page"><span className="eyebrow">Plan required</span><h1>Upgrade to unlock this feature.</h1><p>Compare available plans before enabling it for your institution.</p><Link className="button button-primary" href="/pricing">View plans</Link></main>;
}
