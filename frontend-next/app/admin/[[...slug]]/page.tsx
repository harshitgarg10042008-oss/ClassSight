import { notFound } from 'next/navigation';
import { StaticPage } from '@/components/StaticPage';
import { adminSections } from '@/lib/demo-data';

export default function AdminPage({ params }: { params: { slug?: string[] } }) {
  if (process.env.NEXT_PUBLIC_DEMO_DATA !== 'true') notFound();
  const section = params.slug?.join('/') || 'overview';
  return <StaticPage title={section.replaceAll('-', ' ')} eyebrow="Institution admin"><div className="dashboard-grid"><div className="metric-card"><span>Active students</span><strong>128 sample</strong></div><div className="metric-card"><span>Rooms and cameras</span><strong>4 sample</strong></div><div className="metric-card"><span>Plan usage</span><strong>Essential</strong></div></div><section className="section-card"><h2>{section === 'overview' ? 'Administration workspace' : 'Sample configuration'}</h2><p>Sample data only. This static panel represents {section.replaceAll('-', ' ')} and is not connected to a production institution account.</p><nav className="admin-links" aria-label="Admin sections">{adminSections.map((item) => <a href={`/admin/${item}`} key={item}>{item.replaceAll('-', ' ')}</a>)}</nav></section></StaticPage>;
}
