'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PageLayout } from '@/components/PageLayout';
import { LockedFeature } from '@/components/LockedFeature';
import { LeaveIcon, CheckIcon, CloseIcon } from '@/components/ui/Icons';

export default function LeaveRequestsPage() {
  const [requests, setRequests] = useState([
    {
      id: 'L-101',
      studentName: 'Aarav Patel',
      rollNumber: 'CS-101',
      classSection: 'CS-2026-A',
      type: 'Medical Leave',
      dateRange: '08-Nov-2026 to 09-Nov-2026',
      days: 2,
      reason: 'Viral fever accompanied by severe cough. Medical certificate attached.',
      proof: 'dr_sharma_clinic_slip.pdf',
      status: 'PENDING',
    },
    {
      id: 'L-102',
      studentName: 'Priya Iyer',
      rollNumber: 'CS-104',
      classSection: 'CS-2026-A',
      type: 'Official Duty (OD)',
      dateRange: '04-Nov-2026',
      days: 1,
      reason: 'Representing university at Inter-College Hackathon finals.',
      proof: 'hackathon_od_letter.pdf',
      status: 'APPROVED',
    },
    {
      id: 'L-103',
      studentName: 'Rahul Verma',
      rollNumber: 'CS-105',
      classSection: 'CS-2026-A',
      type: 'Sports Condonation',
      dateRange: '28-Oct-2026 to 30-Oct-2026',
      days: 3,
      reason: 'State-level basketball tournament training camp.',
      proof: 'sports_dept_approval.pdf',
      status: 'REJECTED',
    },
  ]);

  const [message, setMessage] = useState('');

  function handleDecision(id: string, decision: 'APPROVED' | 'REJECTED') {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: decision } : r))
    );
    setMessage(`Leave request ${id} ${decision.toLowerCase()}. Demo mode, nothing was sent.`);
    setTimeout(() => setMessage(''), 4500);
  }

  return (
    <PageLayout
      title="Student Leave &amp; Condonation Requests"
      crumbs={[{ label: 'Workspace', href: '/app' }, { label: 'Leave' }]}
      isSampleData={true}
    >
      <div className="section-card" style={{ marginBottom: 24 }}>
        <div className="section-head">
          <div>
            <span className="eyebrow">Attendance Exemption &bull; Feature D15</span>
            <h2>Leave &amp; Condonation Applications</h2>
            <p className="hint">
              Review documented absences submitted by students. Approved leaves automatically adjust attendance percentage calculations and excuse sessions from defaulter tallies.
            </p>
          </div>
          <span className="badge badge-purple">Advanced Plan Capability</span>
        </div>

        <div className="stats-grid" style={{ marginTop: 16 }}>
          <div className="stat-card amber">
            <div className="stat-value">{requests.filter((r) => r.status === 'PENDING').length}</div>
            <div className="stat-label">Pending Faculty Approval</div>
          </div>
          <div className="stat-card green">
            <div className="stat-value">{requests.filter((r) => r.status === 'APPROVED').length}</div>
            <div className="stat-label">Approved Condonations</div>
          </div>
          <div className="stat-card red">
            <div className="stat-value">{requests.filter((r) => r.status === 'REJECTED').length}</div>
            <div className="stat-label">Rejected Requests</div>
          </div>
          <div className="stat-card blue">
            <div className="stat-value">6 Days</div>
            <div className="stat-label">Total Days Requested</div>
          </div>
        </div>
      </div>

      {message && (
        <div className="alert alert-info" style={{ marginBottom: 20 }}>
          {message}
        </div>
      )}

      <div className="section-card" style={{ marginBottom: 24 }}>
        <div className="section-head">
          <div>
            <span className="eyebrow">Student Submissions</span>
            <h2>Active Condonation Applications</h2>
          </div>
        </div>

        <div className="table-wrap" style={{ marginTop: 16 }}>
          <table>
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Student</th>
                <th>Leave Type</th>
                <th>Dates &amp; Duration</th>
                <th>Reason &amp; Documentation</th>
                <th>Status</th>
                <th>Decision</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td><strong>{r.id}</strong></td>
                  <td>
                    <Link href={`/app/students/${r.rollNumber.toLowerCase()}`} style={{ fontWeight: 700 }}>
                      {r.studentName}
                    </Link>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      {r.rollNumber} &bull; {r.classSection}
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-blue">{r.type}</span>
                  </td>
                  <td>
                    <div>{r.dateRange}</div>
                    <small style={{ color: 'var(--text-muted)' }}>({r.days} lecture days)</small>
                  </td>
                  <td style={{ maxWidth: 260 }}>
                    <div style={{ fontSize: 12.5, lineHeight: 1.4 }}>{r.reason}</div>
                    <div style={{ marginTop: 4 }}>
                      <span style={{ fontSize: 11, color: 'var(--lagoon-600)', fontFamily: 'monospace' }}>
                        Attachment: {r.proof}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        r.status === 'APPROVED' ? 'badge-green' : r.status === 'REJECTED' ? 'badge-red' : 'badge-amber'
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td>
                    {r.status === 'PENDING' ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          className="btn-sm"
                          style={{ backgroundColor: 'var(--tier-auto-text)', color: '#fff' }}
                          onClick={() => handleDecision(r.id, 'APPROVED')}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="btn-sm btn-secondary"
                          style={{ color: '#dc2626' }}
                          onClick={() => handleDecision(r.id, 'REJECTED')}
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Decided</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <LockedFeature
        name="ERP Sync &amp; Automatic Attendance Condonation"
        plan="Advanced"
        description="Synchronizes approved medical slips and official duty entries directly with institution ERPs (e.g. SAP, Ellucian, PeopleSoft) without manual paperwork."
      />
    </PageLayout>
  );
}

