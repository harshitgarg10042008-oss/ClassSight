'use client';

import { useState, useEffect } from 'react';
import { PageLayout } from '@/components/PageLayout';
import { RouteState } from '@/components/RouteState';
import { api, type StudentRosterItem } from '@/lib/api';

export default function EnrollmentPage() {
  const [roster, setRoster] = useState<StudentRosterItem[]>([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getStudentRoster()
      .then(setRoster)
      .catch((err: unknown) => setMsg(err instanceof Error ? err.message : 'Unable to load enrollment.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageLayout pageId="enrollment">
      <div className="section-card">
        <div className="section-head">
          <div>
            <span className="eyebrow">Enrollment Portal</span>
            <h2>Student Biometrics</h2>
          </div>
        </div>
        <div className="tab-nav">
          <button className="tab-btn active">Single Enrollment</button>
          <button className="tab-btn">Bulk Upload (CSV + ZIP)</button>
          <button className="tab-btn">Enrolled Roster</button>
        </div>
        <div style={{ marginTop: 20 }}>
          <p>Enrollment functionality - work in progress</p>
          <RouteState loading={loading} error={msg} empty={roster.length === 0} emptyMessage="No students are enrolled yet.">
            <div className="student-grid">
              {roster.map(s => (
              <div key={s.id} className="student-card">
                <div style={{ fontWeight: 600 }}>{s.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{s.rollNumber}</div>
                <div className={`status-pill ${s.faceRegistered ? 'status-green' : 'status-amber'}`}>
                  {s.faceRegistered ? '128-d Registered' : 'No Face'}
                </div>
              </div>
              ))}
            </div>
          </RouteState>
        </div>
      </div>
    </PageLayout>
  );
}
