import { StaticPage } from '@/components/StaticPage';

export default function TeacherSettingsPage() {
  return <StaticPage title="Teacher settings" eyebrow="Teacher workspace"><section className="section-card"><h2>Capture preferences</h2><p>Choose the default room, review confidence display, and consent reminder behavior.</p><label><input type="checkbox" defaultChecked /> Show review states before finalizing</label><label><input type="checkbox" defaultChecked /> Ask for consent confirmation before capture</label><button className="button button-primary">Save preferences</button></section></StaticPage>;
}
