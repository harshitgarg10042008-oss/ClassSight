'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageLayout } from '@/components/PageLayout';
import { api, type StudentRosterItem } from '@/lib/api';
import { StudentsIcon, EnrollIcon, SearchIcon, FilterIcon } from '@/components/ui/Icons';

export default function StudentsDirectoryPage() {
  const [roster, setRoster] = useState<StudentRosterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterBio, setFilterBio] = useState<'all' | 'registered' | 'pending'>('all');

  useEffect(() => {
    api.getStudentRoster()
      .then((data) => setRoster(Array.isArray(data) ? data : []))
      .catch(() => {
        // Fallback sample roster
        setRoster([
          { id: 101, rollNumber: 'CS-101', name: 'Aarav Patel', active: true, createdAt: '2026-08-01', faceRegistered: true, consentGiven: true, classSectionName: 'CS-2026-A' },
          { id: 102, rollNumber: 'CS-102', name: 'Ananya Sharma', active: true, createdAt: '2026-08-01', faceRegistered: true, consentGiven: true, classSectionName: 'CS-2026-A' },
          { id: 103, rollNumber: 'CS-103', name: 'Rohan Gupta', active: true, createdAt: '2026-08-01', faceRegistered: true, consentGiven: true, classSectionName: 'CS-2026-A' },
          { id: 104, rollNumber: 'CS-104', name: 'Priya Iyer', active: true, createdAt: '2026-08-01', faceRegistered: true, consentGiven: true, classSectionName: 'CS-2026-A' },
          { id: 105, rollNumber: 'CS-105', name: 'Rahul Verma', active: true, createdAt: '2026-08-01', faceRegistered: false, consentGiven: true, classSectionName: 'CS-2026-A' },
          { id: 106, rollNumber: 'CS-106', name: 'Ishita Sen', active: true, createdAt: '2026-08-01', faceRegistered: true, consentGiven: true, classSectionName: 'CS-2026-A' },
          { id: 201, rollNumber: 'CS-201', name: 'Vikram Joshi', active: true, createdAt: '2026-08-02', faceRegistered: true, consentGiven: true, classSectionName: 'CS-2026-B' },
          { id: 202, rollNumber: 'CS-202', name: 'Tanvi Nair', active: true, createdAt: '2026-08-02', faceRegistered: false, consentGiven: false, classSectionName: 'CS-2026-B' },
          { id: 301, rollNumber: 'EC-101', name: 'Aditya Rao', active: true, createdAt: '2026-08-03', faceRegistered: true, consentGiven: true, classSectionName: 'EC-2026-A' },
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = roster.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.rollNumber.toLowerCase().includes(search.toLowerCase());
    const matchesBio =
      filterBio === 'all'
        ? true
        : filterBio === 'registered'
        ? s.faceRegistered
        : !s.faceRegistered;
    return matchesSearch && matchesBio;
  });

  const registeredCount = roster.filter((s) => s.faceRegistered).length;
  const pendingCount = roster.length - registeredCount;

  return (
    <PageLayout
      title="Student Directory"
      crumbs={[{ label: 'Workspace', href: '/app' }, { label: 'Students' }]}
      isSampleData={true}
      actions={
        <Link href="/app/enrollment" className="button-primary cs-button">
          <EnrollIcon size={16} />
          <span>Enrol New Student</span>
        </Link>
      }
    >
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card blue">
          <div className="stat-value">{roster.length}</div>
          <div className="stat-label">Total Students</div>
        </div>
        <div className="stat-card green">
          <div className="stat-value">{registeredCount}</div>
          <div className="stat-label">128-d Biometrics Enrolled</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-value">{pendingCount}</div>
          <div className="stat-label">Pending Face Registration</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-value">98.2%</div>
          <div className="stat-label">Consent Given Rate</div>
        </div>
      </div>

      <div className="section-card">
        <div className="section-head">
          <div>
            <span className="eyebrow">Directory &amp; Consent</span>
            <h2>Enrolled Students</h2>
            <p className="hint">
              Face embeddings are generated via FaceNet and stored as normalized 128-d vectors. Click any student to review their attendance timeline.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search by name or roll number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)', minWidth: 220 }}
            />
            <select
              value={filterBio}
              onChange={(e) => setFilterBio(e.target.value as any)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface)' }}
            >
              <option value="all">All Biometrics</option>
              <option value="registered">Registered Faces</option>
              <option value="pending">Pending Enrollment</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="alert alert-info" style={{ marginTop: 16 }}>
            <span className="spinner" /> Loading student roster...
          </div>
        ) : (
          <div className="table-wrap" style={{ marginTop: 16 }}>
            <table>
              <thead>
                <tr>
                  <th>Roll Number</th>
                  <th>Student Name</th>
                  <th>Class Section</th>
                  <th>Biometric Face Status</th>
                  <th>Consent State</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
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
                      <Link href={`/app/classes/${(s.classSectionName || 'cs-2026-a').toLowerCase()}`}>
                        {s.classSectionName || 'CS-2026-A'}
                      </Link>
                    </td>
                    <td>
                      <span className={`status-pill ${s.faceRegistered ? 'status-green' : 'status-amber'}`}>
                        {s.faceRegistered ? '128-d Registered' : 'Pending Photo'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${s.consentGiven !== false ? 'badge-green' : 'badge-red'}`}>
                        {s.consentGiven !== false ? 'Consent Given' : 'Consent Pending'}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-blue">{s.active ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td>
                      <Link href={`/app/students/${s.id}`} className="btn-sm btn-secondary" style={{ textDecoration: 'none' }}>
                        Timeline &amp; Detail →
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

