'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PageLayout } from '@/components/PageLayout';
import { ClassesIcon, CameraIcon, EnrollIcon, SearchIcon } from '@/components/ui/Icons';

export default function ClassesPage() {
  const [search, setSearch] = useState('');

  const classes = [
    {
      id: 'cs-2026-a',
      name: 'CS-2026-A',
      subjectCode: 'MATH101',
      subjectName: 'Mathematics I',
      department: 'Computer Science & Engineering',
      academicYear: 2026,
      studentsCount: 42,
      sessionsCount: 14,
      avgAttendance: 86.4,
      trend: 'Steady (+1.2%)',
      trendTone: 'green',
      defaultersCount: 2,
    },
    {
      id: 'cs-2026-b',
      name: 'CS-2026-B',
      subjectCode: 'CS201',
      subjectName: 'Data Structures',
      department: 'Computer Science & Engineering',
      academicYear: 2026,
      studentsCount: 38,
      sessionsCount: 11,
      avgAttendance: 79.1,
      trend: 'Declining (-3.5%)',
      trendTone: 'amber',
      defaultersCount: 5,
    },
    {
      id: 'ec-2026-a',
      name: 'EC-2026-A',
      subjectCode: 'PHY110',
      subjectName: 'Physics I',
      department: 'Electronics & Communication',
      academicYear: 2026,
      studentsCount: 31,
      sessionsCount: 8,
      avgAttendance: 91.0,
      trend: 'Steady (+0.4%)',
      trendTone: 'green',
      defaultersCount: 0,
    },
  ];

  const filtered = classes.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.subjectCode.toLowerCase().includes(search.toLowerCase()) ||
      c.subjectName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageLayout
      title="Classes & Sections"
      crumbs={[{ label: 'Workspace', href: '/app' }, { label: 'Classes' }]}
      isSampleData={true}
      actions={
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/app/enrollment" className="button-secondary cs-button">
            <EnrollIcon size={16} />
            <span>Enrol Student</span>
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
          <div className="stat-value">{classes.length}</div>
          <div className="stat-label">Assigned Classes</div>
        </div>
        <div className="stat-card green">
          <div className="stat-value">111</div>
          <div className="stat-label">Total Enrolled Students</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-value">33</div>
          <div className="stat-label">Sessions Conducted</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-value">7</div>
          <div className="stat-label">Total Defaulters (&lt;75%)</div>
        </div>
      </div>

      <div className="section-card">
        <div className="section-head">
          <div>
            <span className="eyebrow">Faculty Assignments</span>
            <h2>Active Assigned Classes</h2>
            <p className="hint">Select a class section to view student roster, attendance trends, and conduct biometrics enrollment.</p>
          </div>
          <div style={{ minWidth: 240 }}>
            <input
              type="text"
              placeholder="Search by class or subject..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)' }}
            />
          </div>
        </div>

        <div className="table-wrap" style={{ marginTop: 16 }}>
          <table>
            <thead>
              <tr>
                <th>Class Section</th>
                <th>Course / Subject</th>
                <th>Department</th>
                <th>Enrolled</th>
                <th>Sessions</th>
                <th>Avg Attendance</th>
                <th>Trend</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/app/classes/${c.id}`} style={{ fontWeight: 700, fontSize: 14 }}>
                      {c.name}
                    </Link>
                  </td>
                  <td>
                    <strong>{c.subjectCode}</strong> &bull; {c.subjectName}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{c.department}</td>
                  <td>
                    <span className="tabular-nums" style={{ fontWeight: 600 }}>{c.studentsCount}</span>
                  </td>
                  <td>
                    <span className="tabular-nums">{c.sessionsCount}</span>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        c.avgAttendance >= 80 ? 'badge-green' : c.avgAttendance >= 75 ? 'badge-amber' : 'badge-red'
                      }`}
                    >
                      {c.avgAttendance.toFixed(1)}%
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: 12, color: c.trendTone === 'green' ? 'var(--tier-auto-text)' : 'var(--tier-review-text)' }}>
                      {c.trend}
                    </span>
                  </td>
                  <td>
                    <Link href={`/app/classes/${c.id}`} className="btn-sm btn-secondary" style={{ textDecoration: 'none' }}>
                      View Details →
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

