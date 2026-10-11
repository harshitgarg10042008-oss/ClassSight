'use client';

import { PageLayout } from '@/components/PageLayout';

export default function AdminPage() {
  return (
    <PageLayout pageId="admin">
      <div className="section-card">
        <div className="section-head">
          <div>
            <span className="eyebrow">Admin Portal</span>
            <h2>Timetable & Infrastructure</h2>
          </div>
        </div>
        <div style={{ marginTop: 20 }}>
          <p>Admin functionality - work in progress</p>
        </div>
      </div>
    </PageLayout>
  );
}
