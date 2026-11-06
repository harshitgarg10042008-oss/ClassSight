import { StaticPage } from '@/components/StaticPage';
import { LockedFeature } from '@/components/LockedFeature';

export default function TeacherNotificationsPage() {
  return <StaticPage title="Notifications" eyebrow="Teacher workspace"><LockedFeature name="Email and SMS notifications" plan="Pro" description="Send attendance updates to approved recipients after a session is finalized." /></StaticPage>;
}
