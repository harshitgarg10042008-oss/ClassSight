'use client';

import { useState, useEffect } from 'react';
import { PageLayout } from '@/components/PageLayout';
import { RouteState } from '@/components/RouteState';
import { api, type Dispute } from '@/lib/api';

export default function HodPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDisputes()
      .then(setDisputes)
      .catch(err => setMsg(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageLayout pageId="hod">
      <div className="section-card">
        <div className="section-head">
          <div>
            <span className="eyebrow">HOD Portal</span>
            <h2>Disputes & Audit</h2>
          </div>
        </div>
        <div style={{ marginTop: 20 }}>
          <p>HOD functionality - work in progress</p>
          <RouteState loading={loading} error={msg} empty={disputes.length === 0} emptyMessage="No disputes require review.">
          {disputes.length > 0 && (
            <div className="student-grid">
              {disputes.map(d => (
                <div key={d.id} className="student-card">
                  <div style={{ fontWeight: 600 }}>{d.studentName || 'Unknown'}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{d.rollNumber || 'N/A'}</div>
                  <div className={`status-pill ${d.status === 'APPROVED' ? 'status-green' : d.status === 'REJECTED' ? 'status-red' : 'status-amber'}`}>
                    {d.status}
                  </div>
                  <div style={{ fontSize: 11, marginTop: 4 }}>{d.reason}</div>
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
