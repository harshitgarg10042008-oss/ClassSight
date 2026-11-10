'use client';

import React from 'react';
import Link from 'next/link';
import { PageLayout } from '@/components/PageLayout';
import { HelpIcon, KbdIcon, CameraIcon, ReviewIcon } from '@/components/ui/Icons';

export default function HelpAndShortcutsPage() {
  const shortcuts = [
    { key: 'Ctrl + K / Cmd + K', action: 'Open Global Search & Command Palette' },
    { key: '?', action: 'Show Keyboard Shortcuts Modal' },
    { key: '← / →', action: 'Cycle between horizontal tabs' },
    { key: 'Esc', action: 'Close any open modal, dropdown, or palette' },
    { key: 'Enter', action: 'Select highlighted search result or confirm decision' },
  ];

  const guides = [
    {
      title: 'Taking Live Attendance',
      summary: 'Select assigned room and class, ensure adequate room lighting, and capture one or multiple frames.',
      link: '/app/teacher',
    },
    {
      title: 'Faculty Review Step',
      summary: 'Single-capture attendance cannot be committed without the faculty review call; multi-shot finalise can finalise a clean accumulator by explicit faculty action.',
      link: '/app/review',
    },
    {
      title: 'Student Biometrics Enrollment',
      summary: 'Capture 3 clean face photos per student with active consent ledger entries.',
      link: '/app/enrollment',
    },
    {
      title: 'Managing Timetable Windows',
      summary: 'Attendance is enabled during scheduled windows. Late captures are marked with timestamps.',
      link: '/app/timetable',
    },
  ];

  return (
    <PageLayout
      title="Faculty Help &amp; Keyboard Shortcuts"
      crumbs={[{ label: 'Workspace', href: '/app' }, { label: 'Help' }]}
      isSampleData={true}
    >
      <div className="section-card" style={{ marginBottom: 24 }}>
        <div className="section-head">
          <div>
            <span className="eyebrow">Productivity &amp; Navigation</span>
            <h2>Keyboard Shortcuts Reference</h2>
            <p className="hint">Master these shortcuts to operate ClassSight quickly during classroom lectures.</p>
          </div>
          <span className="badge badge-blue">Keyboard Accessible</span>
        </div>

        <div className="table-wrap" style={{ marginTop: 16 }}>
          <table>
            <thead>
              <tr>
                <th>Shortcut Keys</th>
                <th>Action &amp; Description</th>
              </tr>
            </thead>
            <tbody>
              {shortcuts.map((s) => (
                <tr key={s.key}>
                  <td style={{ width: 240 }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, padding: '3px 8px', borderRadius: 4, background: 'var(--surface-raised)', border: '1px solid var(--line)' }}>
                      {s.key}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{s.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="section-card" style={{ marginBottom: 24 }}>
        <div className="section-head">
          <div>
            <span className="eyebrow">Faculty Workflows</span>
            <h2>Operational Guides &amp; Documentation</h2>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginTop: 16 }}>
          {guides.map((g) => (
            <div key={g.title} style={{ padding: 18, border: '1px solid var(--line)', borderRadius: 10, background: 'var(--surface)' }}>
              <h3 style={{ fontSize: 15, margin: '0 0 8px', color: 'var(--text)' }}>{g.title}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 14px', lineHeight: 1.45 }}>
                {g.summary}
              </p>
              <Link href={g.link} className="btn-sm btn-secondary" style={{ textDecoration: 'none' }}>
                Open Workspace →
              </Link>
            </div>
          ))}
        </div>
      </div>

      <div className="section-card">
        <div className="section-head">
          <div>
            <span className="eyebrow">Support &amp; Assistance</span>
            <h2>Need Faculty IT Help?</h2>
          </div>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginTop: 10 }}>
          If camera streams are offline, or student facial vectors fail to compute, contact your campus IT administrator at <code>support@institution.edu</code> or call internal extension <strong>#4040</strong>.
        </p>
      </div>
    </PageLayout>
  );
}
