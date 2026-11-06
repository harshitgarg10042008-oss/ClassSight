'use client';

import { useState, useEffect } from 'react';
import { PageLayout } from '@/components/PageLayout';
import { RouteState } from '@/components/RouteState';
import { api, type AnalyticsSummary } from '@/lib/api';

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAnalytics()
      .then(setAnalytics)
      .catch((err: unknown) => setMsg(err instanceof Error ? err.message : 'Unable to load analytics.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageLayout pageId="analytics">
      <div className="section-card">
        <div className="section-head">
          <div>
            <span className="eyebrow">Analytics</span>
            <h2>Attendance Reports</h2>
          </div>
        </div>
        <RouteState loading={loading} error={msg} empty={!analytics} emptyMessage="No attendance analytics are available yet.">
        {analytics ? (
          <div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
              <div className="metric-card">
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Average Attendance</div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{analytics.averageAttendance.toFixed(1)}%</div>
              </div>
              <div className="metric-card">
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Defaulters</div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{analytics.shortfallCount}</div>
              </div>
            </div>
            <p>Analytics functionality - work in progress</p>
          </div>
        ) : null}
        </RouteState>
      </div>
    </PageLayout>
  );
}
