import { PublicInfoPage } from '@/components/PublicInfoPage';
export default function StatusPage() { return <PublicInfoPage eyebrow="System status" title="Local preview status." intro="This page reports the product boundary, not a hosted uptime commitment." preview><section className="section-card"><h2>Preview environment</h2><p>Backend availability depends on the local services configured for this repository.</p></section></PublicInfoPage>; }

export const metadata = { title: 'Platform status | ClassSight' };
