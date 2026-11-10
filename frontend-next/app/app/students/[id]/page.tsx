'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageLayout } from '@/components/PageLayout';
import { LineChart, DonutChart } from '@/components/ui/Charts';
import { StudentsIcon, CameraIcon, DisputesIcon, CheckIcon, WarningIcon } from '@/components/ui/Icons';

export default function StudentDetailPage() {
  const params = useParams();
  const studentId = (Array.isArray(params?.id) ? params.id[0] : params?.id) || '101';

  // Sample student details
  const student = {
    id: studentId,
    rollNumber: studentId === '102' ? 'CS-102' : studentId === '105' ? 'CS-105' : 'CS-101',
    name: studentId === '102' ? 'Ananya Sharma' : studentId === '105' ? 'Rahul Verma' : 'Aarav Patel',
    classSection: 'CS-2026-A',
    department: 'Computer Science & Engineering',
    enrolledDate: '12-Aug-2026',
    consentGiven: true,
    consentTimestamp: '2026-08-12 10:30 UTC',
    faceRegistered: studentId !== '105',
    embeddingDimensions: 128,
    embeddingCount: 3,
    overallAttendance: studentId === '102' ? 71.4 : studentId === '105' ? 64.2 : 92.8,
    attended: studentId === '102' ? 10 : studentId === '105' ? 9 : 13,
    total: 14,
  };

  const timeline = [
    { date: 'Today, 09:04 AM', session: '#21', subject: 'MATH101', status: 'PRESENT', method: 'AUTO (Distance: 5.21)', tone: 'green' },
    { date: 'Yesterday, 09:02 AM', session: '#19', subject: 'MATH101', status: 'PRESENT', method: 'AUTO (Distance: 6.10)', tone: 'green' },
    { date: '04-Nov-2026, 11:00 AM', session: '#15', subject: 'CS201', status: studentId === '105' ? 'ABSENT' : 'PRESENT', method: studentId === '105' ? 'ABSENT (No match)' : 'AUTO (Distance: 5.84)', tone: studentId === '105' ? 'red' : 'green' },
    { date: '02-Nov-2026, 09:00 AM', session: '#13', subject: 'MATH101', status: studentId === '102' ? 'ABSENT' : 'PRESENT', method: studentId === '102' ? 'ABSENT (Unrecognized)' : 'REVIEW (Faculty approved)', tone: studentId === '102' ? 'red' : 'green' },
    { date: '28-Oct-2026, 14:00 PM', session: '#09', subject: 'PHY110', status: 'PRESENT', method: 'AUTO (Distance: 6.02)', tone: 'green' },
  ];

  const shortfallNeeded = Math.ceil((0.75 * student.total - student.attended) / 0.25);

  return (
    <PageLayout
      title={`${student.name} (${student.rollNumber})`}
      crumbs={[
        { label: 'Workspace', href: '/app' },
        { label: 'Students', href: '/app/students' },
        { label: student.rollNumber },
      ]}
      isSampleData={true}
      actions={
        <Link href={`/app/classes/${student.classSection.toLowerCase()}`} className="button-secondary cs-button">
          <span>Back to {student.classSection} Roster</span>
        </Link>
      }
    >
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card blue">
          <div className="stat-value">{student.rollNumber}</div>
          <div className="stat-label">{student.classSection}</div>
        </div>
        <div className={`stat-card ${student.overallAttendance >= 75 ? 'green' : 'red'}`}>
          <div className="stat-value">{student.overallAttendance.toFixed(1)}%</div>
          <div className="stat-label">Term Attendance ({student.attended}/{student.total})</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-value">{student.faceRegistered ? '128-d Verified' : 'Missing'}</div>
          <div className="stat-label">FaceNet Embedding</div>
        </div>
        <div className="stat-card green">
          <div className="stat-value">Active Consent</div>
          <div className="stat-label">Biometric Verification Ledger</div>
        </div>
      </div>

      {student.overallAttendance < 75 && (
        <div className="alert alert-danger" style={{ marginBottom: 24 }}>
          <strong>Attendance Shortfall Warning:</strong> {student.name}&rsquo;s attendance is currently {student.overallAttendance.toFixed(1)}% (below institutional minimum of 75%).
          {shortfallNeeded > 0 && ` Needs ${shortfallNeeded} consecutive attended classes to reach 75%.`}
        </div>
      )}

      {/* Biometrics & Consent Integrity Card */}
      <div className="section-card" style={{ marginBottom: 24 }}>
        <div className="section-head">
          <div>
            <span className="eyebrow">Biometric Identity &amp; Consent</span>
            <h2>Face Registration Profile</h2>
          </div>
          <span className={`badge ${student.faceRegistered ? 'badge-green' : 'badge-amber'}`}>
            {student.faceRegistered ? 'Biometrics Enrolled' : 'Pending Enrollment'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginTop: 16 }}>
          <div style={{ padding: 16, border: '1px solid var(--line)', borderRadius: 10, background: 'var(--surface-raised)' }}>
            <h3 style={{ fontSize: 14, margin: '0 0 8px', color: 'var(--text)' }}>Consent Ledger Record</h3>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <div><strong>Status:</strong> Explicit consent given (self / guardian)</div>
              <div><strong>Recorded At:</strong> {student.consentTimestamp}</div>
              <div><strong>Ledger ID:</strong> CNST-2026-CS101-V1</div>
              <div><strong>Deletion Rights:</strong> May withdraw at any time via Student Portal</div>
            </div>
          </div>

          <div style={{ padding: 16, border: '1px solid var(--line)', borderRadius: 10, background: 'var(--surface-raised)' }}>
            <h3 style={{ fontSize: 14, margin: '0 0 8px', color: 'var(--text)' }}>Embedding Architecture</h3>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <div><strong>Model:</strong> InceptionResnetV1 (FaceNet)</div>
              <div><strong>Vector Dimension:</strong> 128-d L2 Normalized</div>
              <div><strong>Samples Stored:</strong> {student.embeddingCount} reference angles</div>
              <div style={{ color: 'var(--tier-review-text)', fontWeight: 600, marginTop: 4 }}>
                Notice: Face embeddings are not yet encrypted at rest.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Timeline */}
      <div className="section-card">
        <div className="section-head">
          <div>
            <span className="eyebrow">Session Timeline</span>
            <h2>Class Attendance Records</h2>
            <p className="hint">Chronological history of classroom detections and faculty review decisions.</p>
          </div>
          <Link href="/app/disputes" className="btn-sm btn-secondary" style={{ textDecoration: 'none' }}>
            <DisputesIcon size={14} />
            <span>Raise / View Dispute</span>
          </Link>
        </div>

        <div className="table-wrap" style={{ marginTop: 16 }}>
          <table>
            <thead>
              <tr>
                <th>Date &amp; Time</th>
                <th>Session ID</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Detection Diagnostics</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {timeline.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.date}</td>
                  <td>
                    <Link href={`/app/sessions/${item.session.replace('#', '')}`} style={{ fontWeight: 700 }}>
                      {item.session}
                    </Link>
                  </td>
                  <td>{item.subject}</td>
                  <td>
                    <span className={`status-pill ${item.tone === 'green' ? 'status-green' : 'status-red'}`}>
                      {item.status}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                      {item.method}
                    </span>
                  </td>
                  <td>
                    <Link href={`/app/sessions/${item.session.replace('#', '')}`} className="btn-sm btn-secondary" style={{ textDecoration: 'none' }}>
                      Session #
                    </Link>
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

