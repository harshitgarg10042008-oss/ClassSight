'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageLayout } from '@/components/PageLayout';
import { api, type TimetablePeriod } from '@/lib/api';
import { CameraIcon, TodayIcon, ClockIcon, CheckIcon } from '@/components/ui/Icons';

export default function TodayPage() {
  const [period, setPeriod] = useState<TimetablePeriod | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCurrentPeriod()
      .then((data) => setPeriod(data))
      .catch(() => setPeriod(null))
      .finally(() => setLoading(false));
  }, []);

  const schedule = [
    {
      time: '09:00 – 10:00',
      subject: 'Mathematics I (MATH101)',
      section: 'CS-2026-A',
      room: 'Room 101 — Computer Science Lab',
      camera: 'Camera 1 (RTSP · 1080p)',
      status: 'Window Open',
      statusTone: 'green',
      canCapture: true,
      studentsCount: 42,
    },
    {
      time: '11:00 – 12:00',
      subject: 'Data Structures (CS201)',
      section: 'CS-2026-B',
      room: 'Room 102 — Seminar Hall',
      camera: 'Camera 2 (RTSP · 1080p)',
      status: 'Upcoming',
      statusTone: 'blue',
      canCapture: false,
      studentsCount: 38,
    },
    {
      time: '14:00 – 15:00',
      subject: 'Physics I (PHY110)',
      section: 'EC-2026-A',
      room: 'Room 101 — Computer Science Lab',
      camera: 'Camera 1 (RTSP · 1080p)',
      status: 'Scheduled',
      statusTone: 'muted',
      canCapture: false,
      studentsCount: 31,
    },
  ];

  return (
    <PageLayout
      title="Today’s Schedule"
      crumbs={[{ label: 'Workspace', href: '/app' }, { label: 'Today' }]}
      isSampleData={true}
      actions={
        <Link href="/app/teacher" className="button-primary cs-button">
          <CameraIcon size={16} />
          <span>Launch Camera Capture</span>
        </Link>
      }
    >
      <div className="section-card" style={{ marginBottom: 24 }}>
        <div className="section-head">
          <div>
            <span className="eyebrow">Active Period Window</span>
            <h2>Current Timetable Window</h2>
            <p className="hint">
              Faculties can capture attendance while the scheduled window is open. Capture outside scheduled window is logged as late capture.
            </p>
          </div>
          <span className="badge badge-green">Capture Allowed</span>
        </div>

        <div className="stats-grid" style={{ marginTop: 16 }}>
          <div className="stat-card green">
            <div className="stat-value">09:00 – 10:00</div>
            <div className="stat-label">Active Period (CS-2026-A)</div>
          </div>
          <div className="stat-card blue">
            <div className="stat-value">3 Classes</div>
            <div className="stat-label">Scheduled Today</div>
          </div>
          <div className="stat-card amber">
            <div className="stat-value">Room 101</div>
            <div className="stat-label">Assigned Room & Camera</div>
          </div>
          <div className="stat-card purple">
            <div className="stat-value">111</div>
            <div className="stat-label">Total Expected Students</div>
          </div>
        </div>

        <div style={{ marginTop: 20, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href="/app/teacher" className="button-primary cs-button">
            <CameraIcon size={16} />
            <span>Take Attendance for CS-2026-A Now</span>
          </Link>
          <Link href="/app/timetable" className="button-secondary cs-button">
            <span>View Full Weekly Timetable</span>
          </Link>
        </div>
      </div>

      <div className="section-card">
        <div className="section-head">
          <div>
            <span className="eyebrow">Day Schedule</span>
            <h2>Today’s Lecture Periods</h2>
          </div>
          <span className="badge badge-blue">Term 2026</span>
        </div>

        <div className="table-wrap" style={{ marginTop: 16 }}>
          <table>
            <thead>
              <tr>
                <th>Time Window</th>
                <th>Subject & Code</th>
                <th>Class Section</th>
                <th>Room & Camera</th>
                <th>Students</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((slot, i) => (
                <tr key={i}>
                  <td>
                    <strong style={{ fontFamily: 'monospace' }}>{slot.time}</strong>
                  </td>
                  <td>
                    <strong>{slot.subject}</strong>
                  </td>
                  <td>
                    <Link href={`/app/classes/${slot.section.toLowerCase()}`} style={{ fontWeight: 600 }}>
                      {slot.section}
                    </Link>
                  </td>
                  <td>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{slot.room}</span>
                  </td>
                  <td>{slot.studentsCount}</td>
                  <td>
                    <span className={`badge ${slot.statusTone === 'green' ? 'badge-green' : slot.statusTone === 'blue' ? 'badge-blue' : 'badge-gray'}`}>
                      {slot.status}
                    </span>
                  </td>
                  <td>
                    {slot.canCapture ? (
                      <Link href="/app/teacher" className="btn-sm" style={{ textDecoration: 'none' }}>
                        Start Capture
                      </Link>
                    ) : (
                      <Link href={`/app/classes/${slot.section.toLowerCase()}`} className="btn-sm btn-secondary" style={{ textDecoration: 'none' }}>
                        View Roster
                      </Link>
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

