import { StaticPage } from '@/components/StaticPage';
import { LockedFeature } from '@/components/LockedFeature';

export default function TeacherIntegrationsPage() {
  return <StaticPage title="Integrations" eyebrow="Teacher workspace"><LockedFeature name="ERP export and webhooks" plan="Advanced" description="Connect finalized attendance to an institution-approved system." /></StaticPage>;
}
