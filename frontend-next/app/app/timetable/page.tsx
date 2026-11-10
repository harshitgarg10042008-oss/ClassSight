'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PageLayout } from '@/components/PageLayout';
import { TimetableIcon, DownloadIcon, CameraIcon, CheckIcon } from '@/components/ui/Icons';

export default function TimetablePage() {
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const periods = [
    { time: '09:00 – 10:00', label: 'Period 1' },
    { time: '10:00 – 11:00', label: 'Period 2' },
    { time: '11:15 – 12:15', label: 'Period 3' },
    { time: '12:15 – 13:15', label: 'Period 4' },
    { time: '14:00 – 15:00', label: 'Period 5' },
    { time: '15:00 – 16:00', label: 'Period 6' },
  ];

  const timetableGrid: Record<string, Record<string, { code: string; name: string; section: string; room: string; active?: boolean }>> = {
    Monday: {
      '09:00 – 10:00': { code: 'MATH101', name: 'Mathematics I', section: 'CS-2026-A', room: 'Room 101', active: true },
      '11:15 – 12:15': { code: 'CS201', name: 'Data Structures', section: 'CS-2026-B', room: 'Room 102' },
      '14:00 – 15:00': { code: 'PHY110', name: 'Physics I', section: 'EC-2026-A', room: 'Room 101' },
    },
    Tuesday: {
      '10:00 – 11:00': { code: 'MATH101', name: 'Mathematics I', section: 'CS-2026-A', room: 'Room 101' },
      '12:15 – 13:15': { code: 'CS201', name: 'Data Structures', section: 'CS-2026-B', room: 'Room 102' },
    },
    Wednesday: {
      '09:00 – 10:00': { code: 'MATH101', name: 'Mathematics I', section: 'CS-2026-A', room: 'Room 101' },
      '11:15 – 12:15': { code: 'PHY110', name: 'Physics I', section: 'EC-2026-A', room: 'Room 101' },
      '15:00 – 16:00': { code: 'CS201', name: 'Data Structures', section: 'CS-2026-B', room: 'Room 102' },
    },
    Thursday: {
      '10:00 – 11:00': { code: 'CS201', name: 'Data Structures', section: 'CS-2026-B', room: 'Room 102' },
      '14:00 – 15:00': { code: 'PHY110', name: 'Physics I', section: 'EC-2026-A', room: 'Room 101' },
    },
    Friday: {
      '09:00 – 10:00': { code: 'MATH101', name: 'Mathematics I', section: 'CS-2026-A', room: 'Room 101' },
      '11:15 – 12:15': { code: 'CS201', name: 'Data Structures', section: 'CS-2026-B', room: 'Room 102' },
    },
  };

  const API = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

  function handleImport(e: React.FormEvent) {
    e.preventDefault();
    setImporting(true);
    setTimeout(() => {
      setImporting(false);
      setImportMsg('Timetable schedule uploaded and synchronized. Demo mode, nothing was sent.');
      setTimeout(() => setImportMsg(''), 5000);
    }, 1200);
  }

  return (
    <PageLayout
      title="Weekly Timetable &amp; Schedule"
      crumbs={[{ label: 'Workspace', href: '/app' }, { label: 'Timetable' }]}
      isSampleData={true}
      actions={
        <div style={{ display: 'flex', gap: 10 }}>
          <a
            href={`${API}/api/timetable/import/template`}
            download="timetable-template.csv"
            className="button-secondary cs-button"
            title="Download CSV Template for Bulk Import"
          >
            <DownloadIcon size={16} />
            <span>Download CSV Template</span>
          </a>
          <Link href="/app/today" className="button-primary cs-button">
            <TimetableIcon size={16} />
            <span>Today’s Periods</span>
          </Link>
        </div>
      }
    >
      <div className="section-card" style={{ marginBottom: 24 }}>
        <div className="section-head">
          <div>
            <span className="eyebrow">Academic Schedule &bull; Feature D17</span>
            <h2>Weekly Lecture Grid</h2>
            <p className="hint">
              Faculties can only capture attendance during or within 15 minutes of scheduled timetable windows. Captures outside windows are logged as late captures.
            </p>
          </div>
          <span className="badge badge-green">Term 2026 Active</span>
        </div>

        <div className="table-wrap" style={{ marginTop: 20 }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 6 }}>
            <thead>
              <tr>
                <th style={{ width: 140 }}>Period Time</th>
                {days.map((d) => (
                  <th key={d} style={{ textAlign: 'center' }}>{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periods.map((p) => (
                <tr key={p.time}>
                  <td style={{ fontWeight: 700, fontSize: 12.5, fontFamily: 'monospace' }}>
                    <div>{p.label}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{p.time}</div>
                  </td>
                  {days.map((d) => {
                    const slot = timetableGrid[d]?.[p.time];
                    return (
                      <td key={d} style={{ padding: 6, verticalAlign: 'top' }}>
                        {slot ? (
                          <div
                            style={{
                              padding: '10px 12px',
                              borderRadius: 8,
                              border: slot.active ? '2px solid var(--lagoon-500)' : '1px solid var(--line)',
                              backgroundColor: slot.active ? 'rgba(14, 159, 154, 0.08)' : 'var(--surface-raised)',
                            }}
                          >
                            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>
                              {slot.code}
                            </div>
                            <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                              {slot.name}
                            </div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--lagoon-600)', marginTop: 4 }}>
                              {slot.section} &bull; {slot.room}
                            </div>
                            {slot.active && (
                              <div style={{ marginTop: 6 }}>
                                <Link href="/app/teacher" className="btn-sm" style={{ textDecoration: 'none', fontSize: 10, padding: '3px 8px' }}>
                                  Capture Now
                                </Link>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ minHeight: 70, borderRadius: 8, border: '1px dashed var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: 11, color: 'var(--line-strong)' }}>Free</span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {importMsg && (
        <div className="alert alert-info" style={{ marginBottom: 20 }}>
          {importMsg}
        </div>
      )}

      {/* CSV Bulk Import Form */}
      <div className="section-card">
        <div className="section-head">
          <div>
            <span className="eyebrow">Batch Timetable Management</span>
            <h2>Import Timetable via CSV</h2>
            <p className="hint">
              Columns required: <code>day_of_week, start_time, end_time, subject_code, section_name, teacher_username, room_name</code>
            </p>
          </div>
          <a
            href={`${API}/api/timetable/import/template`}
            download="timetable-template.csv"
            style={{ fontSize: 13, fontWeight: 700, color: 'var(--lagoon-600)', textDecoration: 'none' }}
          >
            Download CSV Template
          </a>
        </div>

        <form onSubmit={handleImport} style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <label style={{ flex: 1, minWidth: 260 }}>
            <span style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Choose CSV File</span>
            <input type="file" accept=".csv" required style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface)' }} />
          </label>
          <button type="submit" className="button-primary cs-button" disabled={importing}>
            {importing ? <span className="spinner" /> : <TimetableIcon size={16} />}
            <span>{importing ? 'Processing CSV...' : 'Import Timetable Schedule'}</span>
          </button>
        </form>
        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 8 }}>
          Demo mode, nothing was sent.
        </div>
      </div>
    </PageLayout>
  );
}

