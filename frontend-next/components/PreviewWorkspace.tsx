import Link from 'next/link';
import { PublicInfoPage } from './PublicInfoPage';
import { SampleBanner } from './ui/SampleBanner';

const sections = ['today', 'classes', 'sessions', 'students', 'reports', 'risk', 'leave', 'disputes', 'timetable', 'cameras', 'notifications', 'settings', 'help'];

export function PreviewWorkspace({ area, section = 'overview' }: { area: string; section?: string }) {
  const title = section === 'overview' ? `${area} workspace` : section.replaceAll('-', ' ');
  return <PublicInfoPage eyebrow={area} title={title} intro="A complete preview surface with clear boundaries around sample data." preview><div className="dashboard-grid"><div className="metric-card"><span>Workflow state</span><strong>Ready for review</strong></div><div className="metric-card"><span>Data source</span><strong>Sample data</strong></div><div className="metric-card"><span>Plan gate</span><strong>Advanced</strong></div></div><section className="section-card"><h2>{title}</h2><p>This panel is UI-PREVIEW. No action was sent and no fictional attendance record is presented as real.</p><SampleBanner>Generated from fictional sample data only.</SampleBanner><nav className="admin-links" aria-label={`${area} sections`}>{sections.map((item) => <Link href={`/app/${item}`} key={item}>{item.replaceAll('-', ' ')}</Link>)}</nav></section></PublicInfoPage>;
}
