'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PageLayout } from '@/components/PageLayout';
import { ReportsIcon, DownloadIcon, FilterIcon } from '@/components/ui/Icons';

export default function ReportsPage() {
  const [reportType, setReportType] = useState<'defaulters' | 'monthly' | 'subject'>('defaulters');
  const [exportedMsg, setExportedMsg] = useState('');

  const defaulters = [
    { rollNumber: 'CS-105', name: 'Rahul Verma', classSection: 'CS-2026-A', subject: 'MATH101', attended: 9, total: 14, pct: 64.2, needed: 6 },
    { rollNumber: 'CS-102', name: 'Ananya Sharma', classSection: 'CS-2026-A', subject: 'MATH101', attended: 10, total: 14, pct: 71.4, needed: 2 },
    { rollNumber: 'CS-208', name: 'Ritesh Kumar', classSection: 'CS-2026-B', subject: 'CS201', attended: 7, total: 11, pct: 63.6, needed: 5 },
    { rollNumber: 'CS-214', name: 'Siddharth Roy', classSection: 'CS-2026-B', subject: 'CS201', attended: 8, total: 11, pct: 72.7, needed: 1 },
    { rollNumber: 'CS-222', name: 'Neha Reddy', classSection: 'CS-2026-B', subject: 'CS201', attended: 7, total: 11, pct: 63.6, needed: 5 },
  ];

  function triggerExport(format: string) {
    setExportedMsg(`Generated ${format.toUpperCase()} attendance register. Demo mode, nothing was sent.`);
    setTimeout(() => setExportedMsg(''), 4000);
  }

  return (
    <PageLayout
      title="Attendance Reports"
      crumbs={[{ label: 'Workspace', href: '/app' }, { label: 'Reports' }]}
      isSampleData={true}
      actions={
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="button-secondary cs-button" onClick={() => triggerExport('csv')}>
            <DownloadIcon size={16} />
            <span>Export CSV</span>
          </button>
          <button type="button" className="button-primary cs-button" onClick={() => triggerExport('pdf')}>
            <DownloadIcon size={16} />
            <span>Generate PDF Register</span>
          </button>
        </div>
      }
    >
      {exportedMsg && (
        <div className="alert alert-info" style={{ marginBottom: 20 }}>
          {exportedMsg}
        </div>
      )}

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card red">
          <div className="stat-value">{defaulters.length}</div>
          <div className="stat-label">Students Below 75% Threshold</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-value">33</div>
          <div className="stat-label">Total Conducted Sessions</div>
        </div>
        <div className="stat-card green">
          <div className="stat-value">85.5%</div>
          <div className="stat-label">Term Average Attendance</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-value">3 Classes</div>
          <div className="stat-label">Active Monitored Cohorts</div>
        </div>
      </div>

      <div className="section-card">
        <div className="section-head">
          <div>
            <span className="eyebrow">Institutional Compliance</span>
            <h2>Official Shortfall &amp; Defaulter Register</h2>
            <p className="hint">
              Students falling below the mandatory 75% attendance threshold are listed below for deanery submission and mentor counseling.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className={`btn-sm ${reportType === 'defaulters' ? '' : 'btn-secondary'}`}
              onClick={() => setReportType('defaulters')}
            >
              Defaulter List (&lt;75%)
            </button>
            <button
              type="button"
              className={`btn-sm ${reportType === 'monthly' ? '' : 'btn-secondary'}`}
              onClick={() => setReportType('monthly')}
            >
              Monthly Summary
            </button>
          </div>
        </div>

        <div className="table-wrap" style={{ marginTop: 16 }}>
          <table>
            <thead>
              <tr>
                <th>Roll Number</th>
                <th>Student Name</th>
                <th>Class Section</th>
                <th>Subject</th>
                <th>Attended / Total</th>
                <th>Attendance %</th>
                <th>Classes to Reach 75%</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {defaulters.map((d, i) => (
                <tr key={i}>
                  <td>
                    <Link href={`/app/students/${d.rollNumber.toLowerCase()}`} style={{ fontWeight: 700, fontFamily: 'monospace' }}>
                      {d.rollNumber}
                    </Link>
                  </td>
                  <td>
                    <Link href={`/app/students/${d.rollNumber.toLowerCase()}`} style={{ fontWeight: 600 }}>
                      {d.name}
                    </Link>
                  </td>
                  <td>{d.classSection}</td>
                  <td>{d.subject}</td>
                  <td>
                    <span className="tabular-nums">{d.attended} / {d.total}</span>
                  </td>
                  <td>
                    <span className={`badge ${d.pct < 65 ? 'badge-red' : 'badge-amber'}`}>
                      {d.pct.toFixed(1)}%
                    </span>
                  </td>
                  <td>
                    <strong style={{ color: '#dc2626' }}>+{d.needed} classes</strong>
                  </td>
                  <td>
                    <Link href={`/app/students/${d.rollNumber.toLowerCase()}`} className="btn-sm btn-secondary" style={{ textDecoration: 'none' }}>
                      View Student →
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

