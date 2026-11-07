import type { Metadata } from 'next';
import { WorkspaceChrome } from '@/components/shell/WorkspaceChrome';
import { NotificationCentre } from '@/components/shell/NotificationCentre';

export const metadata: Metadata = {
  title: 'Notification centre | ClassSight',
  description: 'Sample notifications with an in-browser read state. Nothing is sent.',
};

export default function NotificationsPage() {
  return (
    <main id="main-content" className="workspace-shell">
      <WorkspaceChrome />
      <header className="workspace-header">
        <div>
          <span className="eyebrow">Notifications</span>
          <h1>Notification centre</h1>
          <p className="page-subtitle">
            Every message ClassSight would raise after a capture, a consent change or a dispute. Marking one read is
            local to this browser.
          </p>
        </div>
        <div className="workspace-header-meta">
          <span className="badge badge-blue">UI-PREVIEW</span>
          <span className="badge badge-gray">In-app only</span>
        </div>
      </header>

      <div className="sample-banner" role="status">
        <strong>Preview</strong> Demo mode, nothing was sent. These notifications are fictional and no email or SMS
        channel exists in this build.
      </div>

      <NotificationCentre />

      <section className="section-card" aria-labelledby="notification-boundaries">
        <div className="section-head"><h2 id="notification-boundaries">What this page does not do</h2></div>
        <ul className="honesty-list">
          <li>Face embeddings are not yet encrypted at rest.</li>
          <li>Nothing is auto-committed: a faculty member must review each attendance record before it is committed.</li>
          <li>Demo mode, nothing was sent.</li>
          <li>Read state lives in this browser; clearing site data resets it.</li>
        </ul>
      </section>
    </main>
  );
}
