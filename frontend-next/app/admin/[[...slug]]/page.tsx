import { notFound } from 'next/navigation';
import { StaticPage } from '@/components/StaticPage';

export default function AdminPage() {
  if (process.env.NEXT_PUBLIC_DEMO_DATA !== 'true') notFound();
  return <StaticPage title="Institution admin" eyebrow="Admin console"><div className="dashboard-grid"><div className="metric-card"><span>Active students</span><strong>Sample data</strong></div><div className="metric-card"><span>Rooms and cameras</span><strong>Sample data</strong></div><div className="metric-card"><span>Plan usage</span><strong>Essential</strong></div></div><div className="section-card"><h2>Administration workspace</h2><p>Departments, users, rooms, privacy requests, integrations, audit log, billing, and security settings are represented here as demo surfaces.</p></div></StaticPage>;
}
