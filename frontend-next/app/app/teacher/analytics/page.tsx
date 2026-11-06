import { StaticPage } from '@/components/StaticPage';
import { LockedFeature } from '@/components/LockedFeature';

export default function TeacherAnalyticsPage() {
  return <StaticPage title="Attendance insights" eyebrow="Teacher workspace"><LockedFeature name="Low-attendance alerts" plan="Pro" description="Monitor trends and receive an alert when attendance drops below an institution threshold." /></StaticPage>;
}
