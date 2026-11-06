import { notFound } from 'next/navigation';
import { StaticPage } from '@/components/StaticPage';
import { features } from '@/lib/features';

export default function OwnerPage() {
  if (process.env.NEXT_PUBLIC_DEMO_DATA !== 'true') notFound();
  return <StaticPage title="Platform owner" eyebrow="Owner console"><div className="section-card"><h2>Entitlement matrix</h2><p className="muted">The config files are the source of truth. This demo view shows the current 20-feature registry.</p><div className="feature-table">{features.map((feature) => <div className="feature-row" key={feature.id}><span>{feature.id}</span><strong>{feature.name}</strong><span className="badge">{feature.defaultPlan}</span><span>{feature.buildStatus}</span></div>)}</div></div></StaticPage>;
}
