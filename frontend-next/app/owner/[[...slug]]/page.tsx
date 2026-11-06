import { notFound } from 'next/navigation';
import { StaticPage } from '@/components/StaticPage';
import { OwnerEntitlements } from '@/components/OwnerEntitlements';
import { ownerSections } from '@/lib/demo-data';

export default function OwnerPage({ params }: { params: { slug?: string[] } }) {
  if (process.env.NEXT_PUBLIC_DEMO_DATA !== 'true') notFound();
  const section = params.slug?.join('/') || 'overview';
  return <StaticPage title={section.replaceAll('-', ' ')} eyebrow="Platform owner">{section === 'entitlements' ? <OwnerEntitlements /> : <section className="section-card"><h2>Owner controls</h2><p className="muted">Sample data only. The real source of truth remains the plan configuration files.</p><nav className="admin-links" aria-label="Owner sections">{ownerSections.map((item) => <a href={`/owner/${item}`} key={item}>{item.replaceAll('-', ' ')}</a>)}</nav></section>}</StaticPage>;
}
