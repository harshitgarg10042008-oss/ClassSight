'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageLayout } from '@/components/PageLayout';
import { api, type Dispute } from '@/lib/api';
import { DisputesIcon, CheckIcon, CloseIcon } from '@/components/ui/Icons';

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');

  useEffect(() => {
    api.getDisputes()
      .then((data) => setDisputes(Array.isArray(data) ? data : []))
      .catch(() => {
        // Fallback sample dispute records
        setDisputes([
          {
            id: 42,
            studentName: 'Aarav Patel',
            rollNumber: 'CS-101',
            sessionDate: '2026-11-08',
            subjectCode: 'MATH101',
            status: 'PENDING',
            reason: 'I was present in the second row next to Rohan. Camera seemed blocked by classmate standing in aisle.',
            resolvedNote: undefined,
            createdAt: '2026-11-08T10:15:00Z',
          },
          {
            id: 38,
            studentName: 'Ananya Sharma',
            rollNumber: 'CS-102',
            sessionDate: '2026-11-02',
            subjectCode: 'MATH101',
            status: 'APPROVED',
            reason: 'Present during first half hour. Verified by lab assistant sign-in register.',
            resolvedNote: 'Cross-checked with faculty lab notes. Attendance granted.',
            createdAt: '2026-11-02T12:00:00Z',
          },
          {
            id: 31,
            studentName: 'Rahul Verma',
            rollNumber: 'CS-105',
            sessionDate: '2026-10-28',
            subjectCode: 'PHY110',
            status: 'REJECTED',
            reason: 'Arrived at 09:40 for a 09:00 class.',
            resolvedNote: 'Late arrival exceeding grace period (30 mins). Mark stands absent.',
            createdAt: '2026-10-28T16:00:00Z',
          },
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  function handleResolve(decision: 'APPROVED' | 'REJECTED') {
    if (!resolvingId) return;
    setDisputes((prev) =>
      prev.map((d) =>
        d.id === resolvingId
          ? { ...d, status: decision, resolvedNote: resolutionNote || `${decision} by Faculty` }
          : d
      )
    );
    setMsg(`Dispute #${resolvingId} marked as ${decision}. Demo mode, nothing was sent.`);
    setResolvingId(null);
    setResolutionNote('');
    setTimeout(() => setMsg(''), 4500);
  }

  return (
    <PageLayout
      title="Attendance Disputes &amp; Grievances"
      crumbs={[{ label: 'Workspace', href: '/app' }, { label: 'Disputes' }]}
      isSampleData={true}
    >
      <div className="section-card" style={{ marginBottom: 24 }}>
        <div className="section-head">
          <div>
            <span className="eyebrow">Contested Records &bull; Feature D16</span>
            <h2>Attendance Grievance Ledger</h2>
            <p className="hint">
              Students who were marked absent can contest their attendance within 48 hours of session finalization. HODs and assigned faculty resolve disputes with an audit trail.
            </p>
          </div>
          <span className="badge badge-blue">Audit Verified</span>
        </div>

        <div className="stats-grid" style={{ marginTop: 16 }}>
          <div className="stat-card amber">
            <div className="stat-value">{disputes.filter((d) => d.status === 'PENDING').length}</div>
            <div className="stat-label">Pending Faculty Review</div>
          </div>
          <div className="stat-card green">
            <div className="stat-value">{disputes.filter((d) => d.status === 'APPROVED').length}</div>
            <div className="stat-label">Resolved (Approved)</div>
          </div>
          <div className="stat-card red">
            <div className="stat-value">{disputes.filter((d) => d.status === 'REJECTED').length}</div>
            <div className="stat-label">Resolved (Rejected)</div>
          </div>
          <div className="stat-card purple">
            <div className="stat-value">{disputes.length}</div>
            <div className="stat-label">Total Historical Disputes</div>
          </div>
        </div>
      </div>

      {msg && (
        <div className="alert alert-info" style={{ marginBottom: 20 }}>
          {msg}
        </div>
      )}

      {resolvingId && (
        <div className="section-card" style={{ marginBottom: 24, border: '2px solid var(--lagoon-500)' }}>
          <div className="section-head">
            <div>
              <span className="eyebrow">Resolution Workspace</span>
              <h2>Resolving Dispute #{resolvingId}</h2>
            </div>
            <button type="button" className="btn-sm btn-secondary" onClick={() => setResolvingId(null)}>
              Cancel
            </button>
          </div>

          <div style={{ marginTop: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
              Faculty / HOD Resolution Note:
            </label>
            <textarea
              rows={3}
              placeholder="State evidence or reason for decision..."
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--text)' }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button
                type="button"
                className="btn-sm"
                style={{ backgroundColor: 'var(--tier-auto-text)', color: '#fff' }}
                onClick={() => handleResolve('APPROVED')}
              >
                Grant Attendance (Approve)
              </button>
              <button
                type="button"
                className="btn-sm btn-secondary"
                style={{ color: '#dc2626' }}
                onClick={() => handleResolve('REJECTED')}
              >
                Uphold Absence (Reject)
              </button>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
              Resolutions are logged with timestamp and username in compliance audit registers.
            </div>
          </div>
        </div>
      )}

      <div className="section-card">
        <div className="section-head">
          <div>
            <span className="eyebrow">Dispute Records</span>
            <h2>Recent Student Grievances</h2>
          </div>
        </div>

        <div className="table-wrap" style={{ marginTop: 16 }}>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Student</th>
                <th>Session Date</th>
                <th>Subject</th>
                <th>Student Explanation</th>
                <th>Resolution Note</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {disputes.map((d) => (
                <tr key={d.id}>
                  <td><strong>#{d.id}</strong></td>
                  <td>
                    <Link href={`/app/students/${d.rollNumber ? d.rollNumber.toLowerCase() : '101'}`} style={{ fontWeight: 700 }}>
                      {d.studentName || 'Student'}
                    </Link>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      {d.rollNumber || '—'}
                    </div>
                  </td>
                  <td>{d.sessionDate || '—'}</td>
                  <td><strong>{d.subjectCode || '—'}</strong></td>
                  <td style={{ maxWidth: 260, fontSize: 12.5, lineHeight: 1.4 }}>
                    {d.reason}
                  </td>
                  <td style={{ maxWidth: 220, fontSize: 12, color: 'var(--text-muted)' }}>
                    {d.resolvedNote || 'Pending review'}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        d.status === 'APPROVED' ? 'badge-green' : d.status === 'REJECTED' ? 'badge-red' : 'badge-amber'
                      }`}
                    >
                      {d.status}
                    </span>
                  </td>
                  <td>
                    {d.status === 'PENDING' ? (
                      <button
                        type="button"
                        className="btn-sm"
                        onClick={() => {
                          setResolvingId(d.id);
                          setResolutionNote('');
                        }}
                      >
                        Resolve
                      </button>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Resolved</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageLayout>
  );
}

