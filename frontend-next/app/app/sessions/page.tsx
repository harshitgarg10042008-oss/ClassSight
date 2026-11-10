'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PageLayout } from '@/components/PageLayout';
import { SessionsIcon, ReviewIcon, CameraIcon, DownloadIcon } from '@/components/ui/Icons';

export default function SessionsHistoryPage() {
  const [filterState, setFilterState] = useState<'all' | 'review' | 'finalized'>('all');

  const sessions = [
    {
      id: 21,
      date: 'Today, 09:04 AM',
      classSection: 'CS-2026-A',
      subject: 'MATH101 — Mathematics I',
      room: 'Room 101',
      camera: 'Camera 1',
      autoCount: 38,
      reviewCount: 3,
      unknownCount: 1,
      absentCount: 0,
      status: 'AWAITING_REVIEW',
      statusLabel: 'Awaiting Faculty Review',
      tone: 'amber',
    },
    {
      id: 20,
      date: 'Yesterday, 11:06 AM',
      classSection: 'CS-2026-B',
      subject: 'CS201 — Data Structures',
      room: 'Room 102',
      camera: 'Camera 2',
      autoCount: 33,
      reviewCount: 2,
      unknownCount: 0,
      absentCount: 3,
      status: 'FINALIZED',
      statusLabel: 'Finalized',
      tone: 'green',
    },
    {
      id: 19,
      date: '08-Nov-2026, 09:02 AM',
      classSection: 'CS-2026-A',
      subject: 'MATH101 — Mathematics I',
      room: 'Room 101',
      camera: 'Camera 1',
      autoCount: 40,
      reviewCount: 1,
      unknownCount: 0,
      absentCount: 1,
      status: 'FINALIZED',
      statusLabel: 'Finalized',
      tone: 'green',
    },
    {
      id: 18,
      date: '06-Nov-2026, 09:10 AM',
      classSection: 'EC-2026-A',
      subject: 'PHY110 — Physics I',
      room: 'Room 101',
      camera: 'Camera 1',
      autoCount: 29,
      reviewCount: 1,
      unknownCount: 0,
      absentCount: 1,
      status: 'FINALIZED',
      statusLabel: 'Finalized',
      tone: 'green',
    },
    {
      id: 17,
      date: '05-Nov-2026, 14:05 PM',
      classSection: 'CS-2026-A',
      subject: 'MATH101 — Mathematics I',
      room: 'Room 101',
      camera: 'Camera 1',
      autoCount: 0,
      reviewCount: 0,
      unknownCount: 0,
      absentCount: 42,
      status: 'FAILED',
      statusLabel: 'Failed — Lighting Too Low',
      tone: 'red',
    },
  ];

  const filtered = sessions.filter((s) => {
    if (filterState === 'review') return s.status === 'AWAITING_REVIEW';
    if (filterState === 'finalized') return s.status === 'FINALIZED';
    return true;
  });

  return (
    <PageLayout
      title="Attendance Sessions"
      crumbs={[{ label: 'Workspace', href: '/app' }, { label: 'Sessions' }]}
      isSampleData={true}
      actions={
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/app/review" className="button-secondary cs-button">
            <ReviewIcon size={16} />
            <span>Open Review Queue</span>
          </Link>
          <Link href="/app/teacher" className="button-primary cs-button">
            <CameraIcon size={16} />
            <span>Take Attendance</span>
          </Link>
        </div>
      }
    >
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card blue">
          <div className="stat-value">{sessions.length}</div>
          <div className="stat-label">Total Conducted Sessions</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-value">{sessions.filter((s) => s.status === 'AWAITING_REVIEW').length}</div>
          <div className="stat-label">Awaiting Faculty Review</div>
        </div>
        <div className="stat-card green">
          <div className="stat-value">{sessions.filter((s) => s.status === 'FINALIZED').length}</div>
          <div className="stat-label">Finalized Sessions</div>
        </div>
        <div className="stat-card red">
          <div className="stat-value">1</div>
          <div className="stat-label">Failed Captures</div>
        </div>
      </div>

      <div className="section-card">
        <div className="section-head">
          <div>
            <span className="eyebrow">Audit &amp; Verification</span>
            <h2>Captured Sessions Register</h2>
            <p className="hint">
              Each session contains full face bounding boxes, match distance metrics, and absent rosters. Single-capture attendance cannot be committed without the faculty review call; multi-shot finalise can finalise a clean accumulator by explicit faculty action.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className={`btn-sm ${filterState === 'all' ? '' : 'btn-secondary'}`}
              onClick={() => setFilterState('all')}
            >
              All ({sessions.length})
            </button>
            <button
              type="button"
              className={`btn-sm ${filterState === 'review' ? '' : 'btn-secondary'}`}
              onClick={() => setFilterState('review')}
            >
              Needs Review (1)
            </button>
            <button
              type="button"
              className={`btn-sm ${filterState === 'finalized' ? '' : 'btn-secondary'}`}
              onClick={() => setFilterState('finalized')}
            >
              Finalized (3)
            </button>
          </div>
        </div>

        <div className="table-wrap" style={{ marginTop: 16 }}>
          <table>
            <thead>
              <tr>
                <th>Session</th>
                <th>Class &amp; Subject</th>
                <th>Conducted Date</th>
                <th>Location</th>
                <th>Detections Breakdown</th>
                <th>Absent</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link href={`/app/sessions/${s.id}`} style={{ fontWeight: 700, fontFamily: 'monospace' }}>
                      #{s.id}
                    </Link>
                  </td>
                  <td>
                    <strong>{s.classSection}</strong>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.subject}</div>
                  </td>
                  <td style={{ fontSize: 13 }}>{s.date}</td>
                  <td>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.room} &bull; {s.camera}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, fontSize: 12, fontWeight: 700 }}>
                      <span style={{ color: 'var(--tier-auto-text)' }}>{s.autoCount} AUTO</span>
                      <span aria-hidden="true" style={{ color: 'var(--text-muted)' }}>&bull;</span>
                      <span style={{ color: 'var(--tier-review-text)' }}>{s.reviewCount} REV</span>
                      <span aria-hidden="true" style={{ color: 'var(--text-muted)' }}>&bull;</span>
                      <span style={{ color: 'var(--tier-absent-text)' }}>{s.unknownCount} UNK</span>
                    </div>
                  </td>
                  <td>
                    <span className="tabular-nums" style={{ color: s.absentCount > 0 ? 'var(--tier-absent-text)' : 'var(--text-muted)', fontWeight: 600 }}>
                      {s.absentCount} absent
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        s.tone === 'green' ? 'badge-green' : s.tone === 'amber' ? 'badge-amber' : 'badge-red'
                      }`}
                    >
                      {s.statusLabel}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {s.status === 'AWAITING_REVIEW' ? (
                        <Link href={`/app/review?session=${s.id}`} className="btn-sm" style={{ textDecoration: 'none' }}>
                          Review Now
                        </Link>
                      ) : (
                        <Link href={`/app/sessions/${s.id}`} className="btn-sm btn-secondary" style={{ textDecoration: 'none' }}>
                          Detail →
                        </Link>
                      )}
                    </div>
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

