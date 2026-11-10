'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageLayout } from '@/components/PageLayout';
import { DonutChart } from '@/components/ui/Charts';
import { SessionsIcon, ReviewIcon, DownloadIcon, CheckIcon, WarningIcon } from '@/components/ui/Icons';

export default function SessionDetailPage() {
  const params = useParams();
  const sessionId = (Array.isArray(params?.id) ? params.id[0] : params?.id) || '21';

  // Fictional session detail
  const session = {
    id: sessionId,
    classSection: 'CS-2026-A',
    subject: 'MATH101 — Mathematics I',
    room: 'Room 101 — Computer Science Lab',
    camera: 'Camera 1 (RTSP · 1080p · Hikvision)',
    date: '10-Nov-2026, 09:04 AM',
    teacher: 'Dr. R. Sharma (teacher)',
    status: sessionId === '21' ? 'REVIEW_REQUIRED' : 'FINALIZED',
    statusLabel: sessionId === '21' ? 'Awaiting Faculty Review' : 'Finalized by Dr. R. Sharma',
    autoCount: 38,
    reviewCount: 3,
    unknownCount: 1,
    absentCount: 2,
    totalExpected: 42,
  };

  const donutSegments = [
    { label: 'AUTO Accepted', value: session.autoCount, color: 'var(--tier-auto)' },
    { label: 'Faculty Review Required', value: session.reviewCount, color: 'var(--tier-review)' },
    { label: 'Unknown / Ignored', value: session.unknownCount, color: 'var(--tier-unknown)' },
    { label: 'Absent Students', value: session.absentCount, color: 'var(--tier-absent)' },
  ];

  const absentStudents = [
    { id: '102', rollNumber: 'CS-102', name: 'Ananya Sharma', classSection: 'CS-2026-A', shortfall: true },
    { id: '105', rollNumber: 'CS-105', name: 'Rahul Verma', classSection: 'CS-2026-A', shortfall: true },
  ];

  const diagnostics = [
    { faceIndex: 1, box: [120, 240, 280, 400], studentId: '101', name: 'Aarav Patel', rollNumber: 'CS-101', distance: 5.21, state: 'AUTO', note: 'Strong match below T_auto (7.75)' },
    { faceIndex: 2, box: [130, 250, 420, 540], studentId: '103', name: 'Rohan Gupta', rollNumber: 'CS-103', distance: 6.10, state: 'AUTO', note: 'Strong match below T_auto (7.75)' },
    { faceIndex: 3, box: [115, 235, 560, 680], studentId: '104', name: 'Priya Iyer', rollNumber: 'CS-104', distance: 4.88, state: 'AUTO', note: 'Strong match below T_auto (7.75)' },
    { faceIndex: 4, box: [140, 260, 700, 820], studentId: '106', name: 'Ishita Sen', rollNumber: 'CS-106', distance: 8.42, state: 'REVIEW', note: 'Ambiguous distance between T_auto and T_review' },
    { faceIndex: 5, box: [110, 230, 840, 960], studentId: null, name: 'Unknown visitor', rollNumber: '—', distance: 11.20, state: 'UNKNOWN', note: 'Distance > T_review (9.4924)' },
  ];

  function handleExportCsv() {
    const csvContent = "data:text/csv;charset=utf-8,RollNumber,Name,Status,SessionId\nCS-101,Aarav Patel,PRESENT,21\nCS-103,Rohan Gupta,PRESENT,21\nCS-104,Priya Iyer,PRESENT,21\nCS-106,Ishita Sen,PRESENT,21\nCS-102,Ananya Sharma,ABSENT,21\nCS-105,Rahul Verma,ABSENT,21";
    const encoded = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encoded);
    link.setAttribute("download", `attendance-session-${sessionId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <PageLayout
      title={`Session #${sessionId} Attendance Detail`}
      crumbs={[
        { label: 'Workspace', href: '/app' },
        { label: 'Sessions', href: '/app/sessions' },
        { label: `#${sessionId}` },
      ]}
      isSampleData={true}
      actions={
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="button-secondary cs-button" onClick={handleExportCsv}>
            <DownloadIcon size={16} />
            <span>Export CSV</span>
          </button>
          {session.status === 'REVIEW_REQUIRED' ? (
            <Link href={`/app/review?session=${sessionId}`} className="button-primary cs-button">
              <ReviewIcon size={16} />
              <span>Proceed to Faculty Review</span>
            </Link>
          ) : (
            <span className="badge badge-green" style={{ padding: '8px 14px', fontSize: 13 }}>
              Attendance Committed
            </span>
          )}
        </div>
      }
    >
      <div className="section-card" style={{ marginBottom: 24 }}>
        <div className="section-head">
          <div>
            <span className="eyebrow">Session Metadata</span>
            <h2>{session.subject}</h2>
            <p className="hint">
              Conducted in {session.room} via {session.camera} on {session.date}.
            </p>
          </div>
          <span className={`badge ${session.status === 'REVIEW_REQUIRED' ? 'badge-amber' : 'badge-green'}`}>
            {session.statusLabel}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginTop: 20, alignItems: 'center' }}>
          <div>
            <DonutChart
              segments={donutSegments}
              size={200}
              strokeWidth={26}
              centerLabel="Expected"
              centerValue={session.totalExpected}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: 'var(--tier-auto)' }} />
              <span style={{ fontWeight: 600 }}>{session.autoCount} Students Auto-Accepted</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>(Distance &le; 7.75)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: 'var(--tier-review)' }} />
              <span style={{ fontWeight: 600 }}>{session.reviewCount} Students Awaiting Review</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>(7.75 &lt; Distance &le; 9.49)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: 'var(--tier-unknown)' }} />
              <span style={{ fontWeight: 600 }}>{session.unknownCount} Unknown Faces Detected</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>(Distance &gt; 9.49)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: 'var(--tier-absent)' }} />
              <span style={{ fontWeight: 600 }}>{session.absentCount} Students Marked Absent</span>
            </div>

            <div style={{ marginTop: 8, padding: '10px 14px', border: '1px solid var(--line)', borderRadius: 8, background: 'var(--surface-raised)', fontSize: 12, color: 'var(--text-muted)' }}>
              Single-capture attendance cannot be committed without the faculty review call; multi-shot finalise can finalise a clean accumulator by explicit faculty action.
            </div>
          </div>
        </div>
      </div>

      {/* Absent Students List */}
      <div className="section-card" style={{ marginBottom: 24 }}>
        <div className="section-head">
          <div>
            <span className="eyebrow">Defaulter &amp; Absent Roster</span>
            <h2>Absent Students ({absentStudents.length})</h2>
          </div>
          <span className="badge badge-red">Unexcused</span>
        </div>

        <div className="table-wrap" style={{ marginTop: 16 }}>
          <table>
            <thead>
              <tr>
                <th>Roll Number</th>
                <th>Student Name</th>
                <th>Class Section</th>
                <th>Notification Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {absentStudents.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link href={`/app/students/${s.id}`} style={{ fontWeight: 700, fontFamily: 'monospace' }}>
                      {s.rollNumber}
                    </Link>
                  </td>
                  <td>
                    <Link href={`/app/students/${s.id}`} style={{ fontWeight: 600 }}>
                      {s.name}
                    </Link>
                  </td>
                  <td>{s.classSection}</td>
                  <td>
                    <span className="badge badge-amber">Shortfall Alert Triggered</span>
                  </td>
                  <td>
                    <Link href={`/app/students/${s.id}`} className="btn-sm btn-secondary" style={{ textDecoration: 'none' }}>
                      Student Profile →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recognition Diagnostics */}
      <div className="section-card">
        <div className="section-head">
          <div>
            <span className="eyebrow">Pipeline Trace</span>
            <h2>Recognition Diagnostics (MTCNN + FaceNet + Hungarian)</h2>
          </div>
          <span className="badge badge-blue">Deterministic Seed 42</span>
        </div>

        <div className="table-wrap" style={{ marginTop: 16 }}>
          <table>
            <thead>
              <tr>
                <th>Face #</th>
                <th>Candidate Match</th>
                <th>Manhattan Distance</th>
                <th>Decision Tier</th>
                <th>Bounding Box [T, R, B, L]</th>
                <th>Pipeline Diagnosis</th>
              </tr>
            </thead>
            <tbody>
              {diagnostics.map((d) => (
                <tr key={d.faceIndex}>
                  <td>
                    <strong>#{d.faceIndex}</strong>
                  </td>
                  <td>
                    {d.studentId ? (
                      <Link href={`/app/students/${d.studentId}`} style={{ fontWeight: 600 }}>
                        {d.name} ({d.rollNumber})
                      </Link>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>{d.name}</span>
                    )}
                  </td>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{d.distance.toFixed(2)}</span>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        d.state === 'AUTO' ? 'badge-green' : d.state === 'REVIEW' ? 'badge-amber' : 'badge-red'
                      }`}
                    >
                      {d.state}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                    [{d.box.join(', ')}]
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageLayout>
  );
}

