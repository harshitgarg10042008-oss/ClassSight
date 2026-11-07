import { PublicInfoPage } from '@/components/PublicInfoPage';
export default function ChangelogPage() { return <PublicInfoPage eyebrow="Changelog" title="What is changing." intro="A transparent record of product work, without invented release claims."><section className="section-card"><h2>Current frontend pass</h2><p>Added a polished public site, accessible authentication controls, preview surfaces, and honest status labels.</p></section></PublicInfoPage>; }

export const metadata = { title: 'Changelog | ClassSight' };
