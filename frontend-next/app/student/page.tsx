'use client';

import { useState, useEffect } from 'react';
import { api, type TimetableSession } from '@/lib/api';
import { PageLayout } from '@/components/PageLayout';
import { RouteState } from '@/components/RouteState';

export default function StudentPage() {
  const [timetable, setTimetable] = useState<TimetableSession[]>([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getStudentTimetable()
      .then(setTimetable)
      .catch(err => setMsg(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageLayout pageId="student">
    <div className="section-card">
      <div className="section-head">
        <div>
          <span className="eyebrow">Student Portal</span>
          <h2>My Attendance</h2>
        </div>
      </div>
      <div style={{ marginTop: 20 }}>
        <p>Student functionality - work in progress</p>
        <RouteState loading={loading} error={msg} empty={timetable.length === 0} emptyMessage="No timetable entries are available.">
        {timetable.length > 0 && (
          <div className="student-grid">
            {timetable.map(t => (
              <div key={t.id} className="student-card">
                <div style={{ fontWeight: 600 }}>{t.subjectCode || 'Unknown'}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t.sectionName || 'N/A'}</div>
                <div className={`status-pill ${t.status === 'CONDUCTED' ? 'status-green' : 'status-amber'}`}>
                  {t.status}
                </div>
                <div style={{ fontSize: 11, marginTop: 4 }}>{t.date} · {t.startTime}-{t.endTime}</div>
              </div>
            ))}
          </div>
        )}
        </RouteState>
      </div>
    </div>
    </PageLayout>
  );
}
