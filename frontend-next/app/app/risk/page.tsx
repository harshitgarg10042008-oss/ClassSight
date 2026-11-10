'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PageLayout } from '@/components/PageLayout';
import { LockedFeature } from '@/components/LockedFeature';
import { RiskIcon, WarningIcon, BellIcon, CheckIcon } from '@/components/ui/Icons';

export default function RiskRadarPage() {
  const [alertSent, setAlertSent] = useState<Record<string, boolean>>({});
  const [statusMsg, setStatusMsg] = useState('');

  const atRiskStudents = [
    { id: '105', rollNumber: 'CS-105', name: 'Rahul Verma', classSection: 'CS-2026-A', currentPct: 64.2, projectedPct: 58.0, trajectory: 'Negative (-6.2%)', needed: 6, riskLevel: 'HIGH' },
    { id: '208', rollNumber: 'CS-208', name: 'Ritesh Kumar', classSection: 'CS-2026-B', currentPct: 63.6, projectedPct: 59.2, trajectory: 'Negative (-4.4%)', needed: 5, riskLevel: 'HIGH' },
    { id: '102', rollNumber: 'CS-102', name: 'Ananya Sharma', classSection: 'CS-2026-A', currentPct: 71.4, projectedPct: 73.1, trajectory: 'Recovering (+1.7%)', needed: 2, riskLevel: 'MEDIUM' },
    { id: '214', rollNumber: 'CS-214', name: 'Siddharth Roy', classSection: 'CS-2026-B', currentPct: 72.7, projectedPct: 74.5, trajectory: 'Steady (+0.2%)', needed: 1, riskLevel: 'MEDIUM' },
    { id: '222', rollNumber: 'CS-222', name: 'Neha Reddy', classSection: 'CS-2026-B', currentPct: 63.6, projectedPct: 61.0, trajectory: 'Negative (-2.6%)', needed: 5, riskLevel: 'HIGH' },
  ];

  function sendWarningAlert(rollNumber: string, name: string) {
    setAlertSent((prev) => ({ ...prev, [rollNumber]: true }));
    setStatusMsg(`Shortfall notification dispatched to ${name} and academic mentor. Demo mode, nothing was sent.`);
    setTimeout(() => setStatusMsg(''), 4500);
  }

  return (
    <PageLayout
      title="Risk Radar &amp; Early Shortfall Warnings"
      crumbs={[{ label: 'Workspace', href: '/app' }, { label: 'Risk Radar' }]}
      isSampleData={true}
    >
      <div className="section-card" style={{ marginBottom: 24 }}>
        <div className="section-head">
          <div>
            <span className="eyebrow">Predictive Analytics &bull; Feature D10</span>
            <h2>Attendance Shortfall Radar</h2>
            <p className="hint">
              Detects patterns in missed sessions and projects end-of-term attendance before students fall irreparably below the 75% examination eligibility threshold.
            </p>
          </div>
          <span className="badge badge-purple">Pro Plan Capability</span>
        </div>

        <div className="stats-grid" style={{ marginTop: 16 }}>
          <div className="stat-card red">
            <div className="stat-value">{atRiskStudents.filter((s) => s.riskLevel === 'HIGH').length}</div>
            <div className="stat-label">High Risk (&lt; 65%)</div>
          </div>
          <div className="stat-card amber">
            <div className="stat-value">{atRiskStudents.filter((s) => s.riskLevel === 'MEDIUM').length}</div>
            <div className="stat-label">Moderate Risk (65% – 74%)</div>
          </div>
          <div className="stat-card blue">
            <div className="stat-value">3 Classes</div>
            <div className="stat-label">Scanned Cohorts</div>
          </div>
          <div className="stat-card green">
            <div className="stat-value">92.8%</div>
            <div className="stat-label">Term Target Accuracy</div>
          </div>
        </div>
      </div>

      {statusMsg && (
        <div className="alert alert-info" style={{ marginBottom: 20 }}>
          {statusMsg}
        </div>
      )}

      <div className="section-card" style={{ marginBottom: 24 }}>
        <div className="section-head">
          <div>
            <span className="eyebrow">Actionable Radar</span>
            <h2>Students Projected Below 75%</h2>
          </div>
          <span className="badge badge-red">Early Intervention Required</span>
        </div>

        <div className="table-wrap" style={{ marginTop: 16 }}>
          <table>
            <thead>
              <tr>
                <th>Risk Level</th>
                <th>Student</th>
                <th>Class Section</th>
                <th>Current %</th>
                <th>Projected %</th>
                <th>Trajectory</th>
                <th>Consecutive Needed</th>
                <th>Early Intervention</th>
              </tr>
            </thead>
            <tbody>
              {atRiskStudents.map((s) => (
                <tr key={s.id}>
                  <td>
                    <span className={`badge ${s.riskLevel === 'HIGH' ? 'badge-red' : 'badge-amber'}`}>
                      {s.riskLevel}
                    </span>
                  </td>
                  <td>
                    <Link href={`/app/students/${s.id}`} style={{ fontWeight: 700 }}>
                      {s.name}
                    </Link>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      {s.rollNumber}
                    </div>
                  </td>
                  <td>{s.classSection}</td>
                  <td>
                    <span className="tabular-nums" style={{ fontWeight: 700 }}>
                      {s.currentPct.toFixed(1)}%
                    </span>
                  </td>
                  <td>
                    <span className="tabular-nums" style={{ color: s.projectedPct < 75 ? '#dc2626' : '#16a34a', fontWeight: 700 }}>
                      {s.projectedPct.toFixed(1)}%
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: 12 }}>{s.trajectory}</span>
                  </td>
                  <td>
                    <strong style={{ color: '#dc2626' }}>+{s.needed} classes</strong>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`btn-sm ${alertSent[s.rollNumber] ? 'btn-secondary' : ''}`}
                      disabled={alertSent[s.rollNumber]}
                      onClick={() => sendWarningAlert(s.rollNumber, s.name)}
                    >
                      {alertSent[s.rollNumber] ? <><CheckIcon size={14} /> Alert Dispatched</> : <><BellIcon size={14} /> Send Alert</>}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <LockedFeature
        name="Automated SMS &amp; WhatsApp Escalations"
        plan="Pro"
        description="Automated multi-channel alerts notify parents and guardians when a student misses 3 consecutive periods or drops below institutional thresholds."
      />
    </PageLayout>
  );
}

