'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageLayout } from '@/components/PageLayout';
import { LineChart, BarChart } from '@/components/ui/Charts';
import { CameraIcon, EnrollIcon, StudentsIcon, SessionsIcon, ReportsIcon } from '@/components/ui/Icons';

export default function ClassDetailPage() {
  const params = useParams();
  const classId = (Array.isArray(params?.id) ? params.id[0] : params?.id) || 'cs-2026-a';
  const className = classId.toUpperCase();

  const [activeTab, setActiveTab] = useState<'roster' | 'sessions' | 'trend'>('roster');

  const roster = [
    { id: '101', rollNumber: 'CS-101', name: 'Aarav Patel', faceRegistered: true, consentGiven: true, attendance: 92.8, sessionsAttended: 13, totalSessions: 14, status: 'NORMAL' },
    { id: '102', rollNumber: 'CS-102', name: 'Ananya Sharma', faceRegistered: true, consentGiven: true, attendance: 71.4, sessionsAttended: 10, totalSessions: 14, status: 'RISK' },
    { id: '103', rollNumber: 'CS-103', name: 'Rohan Gupta', faceRegistered: true, consentGiven: true, attendance: 85.7, sessionsAttended: 12, totalSessions: 14, status: 'NORMAL' },
    { id: '104', rollNumber: 'CS-104', name: 'Priya Iyer', faceRegistered: true, consentGiven: true, attendance: 100.0, sessionsAttended: 14, totalSessions: 14, status: 'NORMAL' },
    { id: '105', rollNumber: 'CS-105', name: 'Rahul Verma', faceRegistered: false, consentGiven: true, attendance: 64.2, sessionsAttended: 9, totalSessions: 14, status: 'CRITICAL' },
    { id: '106', rollNumber: 'CS-106', name: 'Ishita Sen', faceRegistered: true, consentGiven: true, attendance: 78.5, sessionsAttended: 11, totalSessions: 14, status: 'NORMAL' },
  ];

  const recentSessions = [
    { id: '21', date: 'Today, 09:04 AM', room: 'Room 101', auto: 38, review: 3, unknown: 1, absent: 0, status: 'Awaiting review' },
    { id: '19', date: 'Yesterday, 09:02 AM', room: 'Room 101', auto: 40, review: 1, unknown: 0, absent: 1, status: 'Finalised' },
    { id: '16', date: '3 days ago', room: 'Room 101', auto: 39, review: 2, unknown: 0, absent: 1, status: 'Finalised' },
    { id: '12', date: 'Last week', room: 'Room 101', auto: 41, review: 0, unknown: 0, absent: 1, status: 'Finalised' },
  ];

  const trendPoints = [
    { label: 'W1', value: 82 },
    { label: 'W2', value: 85 },
    { label: 'W3', value: 81 },
    { label: 'W4', value: 88 },
    { label: 'W5', value: 86 },
    { label: 'W6', value: 89 },
    { label: 'W7', value: 86.4 },
  ];

  return (
    <PageLayout
      title={`${className} &bull; Mathematics I`}
      crumbs={[
        { label: 'Workspace', href: '/app' },
        { label: 'Classes', href: '/app/classes' },
        { label: className },
      ]}
      isSampleData={true}
      actions={
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/app/enrollment" className="button-secondary cs-button">
            <EnrollIcon size={16} />
            <span>Enrol Student</span>
          </Link>
          <Link href="/app/teacher" className="button-primary cs-button">
            <CameraIcon size={16} />
            <span>Take Attendance for {className}</span>
          </Link>
        </div>
      }
    >
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card blue">
          <div className="stat-value">{roster.length}</div>
          <div className="stat-label">Students in Roster</div>
        </div>
        <div className="stat-card green">
          <div className="stat-value">86.4%</div>
          <div className="stat-label">Average Attendance</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-value">14</div>
          <div className="stat-label">Conducted Sessions</div>
        </div>
        <div className="stat-card red">
          <div className="stat-value">2</div>
          <div className="stat-label">Defaulters (&lt; 75%)</div>
        </div>
      </div>

      <div className="section-card" style={{ marginBottom: 24 }}>
        <div className="section-head">
          <div>
            <span className="eyebrow">Weekly Trajectory</span>
            <h2>Term Attendance Trend</h2>
          </div>
          <span className="badge badge-green">Healthy (+1.2%)</span>
        </div>
        <div style={{ marginTop: 16 }}>
          <LineChart points={trendPoints} height={200} />
        </div>
      </div>

      <div className="section-card">
        <div className="section-head">
          <div>
            <span className="eyebrow">Class Details</span>
            <h2>Students &amp; Sessions</h2>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className={`btn-sm ${activeTab === 'roster' ? '' : 'btn-secondary'}`}
              onClick={() => setActiveTab('roster')}
            >
              Class Roster ({roster.length})
            </button>
            <button
              type="button"
              className={`btn-sm ${activeTab === 'sessions' ? '' : 'btn-secondary'}`}
              onClick={() => setActiveTab('sessions')}
            >
              Recent Sessions ({recentSessions.length})
            </button>
          </div>
        </div>

        {activeTab === 'roster' && (
          <div className="table-wrap" style={{ marginTop: 16 }}>
            <table>
              <thead>
                <tr>
                  <th>Roll Number</th>
                  <th>Student Name</th>
                  <th>Biometric Face Status</th>
                  <th>Consent State</th>
                  <th>Attended / Total</th>
                  <th>Attendance %</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((s) => (
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
                    <td>
                      <span className={`status-pill ${s.faceRegistered ? 'status-green' : 'status-amber'}`}>
                        {s.faceRegistered ? '128-d Registered' : 'Missing Embedding'}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-green">Consent Given</span>
                    </td>
                    <td>
                      <span className="tabular-nums">{s.sessionsAttended} / {s.totalSessions}</span>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          s.attendance >= 80 ? 'badge-green' : s.attendance >= 75 ? 'badge-amber' : 'badge-red'
                        }`}
                      >
                        {s.attendance.toFixed(1)}%
                      </span>
                    </td>
                    <td>
                      <Link href={`/app/students/${s.id}`} className="btn-sm btn-secondary" style={{ textDecoration: 'none' }}>
                        Profile →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'sessions' && (
          <div className="table-wrap" style={{ marginTop: 16 }}>
            <table>
              <thead>
                <tr>
                  <th>Session</th>
                  <th>Timestamp</th>
                  <th>Room</th>
                  <th>Breakdown (AUTO / REVIEW / UNKNOWN)</th>
                  <th>Absent</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.map((sess) => (
                  <tr key={sess.id}>
                    <td>
                      <Link href={`/app/sessions/${sess.id}`} style={{ fontWeight: 700 }}>
                        #{sess.id}
                      </Link>
                    </td>
                    <td>{sess.date}</td>
                    <td>{sess.room}</td>
                    <td>
                      <span style={{ color: 'var(--tier-auto-text)', fontWeight: 700 }}>{sess.auto} AUTO</span> &bull;{' '}
                      <span style={{ color: 'var(--tier-review-text)', fontWeight: 700 }}>{sess.review} REV</span> &bull;{' '}
                      <span style={{ color: '#ef4444', fontWeight: 700 }}>{sess.unknown} UNK</span>
                    </td>
                    <td>{sess.absent} absent</td>
                    <td>
                      <span className={`badge ${sess.status === 'Finalised' ? 'badge-green' : 'badge-amber'}`}>
                        {sess.status}
                      </span>
                    </td>
                    <td>
                      <Link href={`/app/sessions/${sess.id}`} className="btn-sm btn-secondary" style={{ textDecoration: 'none' }}>
                        View Breakdown →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageLayout>
  );
}

