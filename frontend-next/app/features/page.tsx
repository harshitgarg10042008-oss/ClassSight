import { Card } from '@/components/ui/Card';
import { PublicInfoPage } from '@/components/PublicInfoPage';
const items = ['Group-photo enrolment', 'Faculty review queue', 'Capture and session history', 'Consent and deletion controls', 'Attendance summaries', 'Role-aware workspaces'];
export const metadata = { title: 'Features | ClassSight' };
export default function FeaturesPage() { return <PublicInfoPage eyebrow="Product" title="A calmer attendance workflow." intro="ClassSight connects capture, recognition, review, and finalization without hiding the human decision."><div className="step-grid">{items.map((item) => <Card key={item}><span className="eyebrow">Built for review</span><h2>{item}</h2><p>Designed as a focused workflow with clear states, accessible controls, and an audit-friendly outcome.</p></Card>)}</div></PublicInfoPage>; }
