'use client';

import React, { useState } from 'react';
import { Card, Tabs, Badge, Switch, Select } from '@/components/ui';

export function NotificationPreferencesAndTemplates() {
  const [activeTab, setActiveTab] = useState<'preferences' | 'templates'>('preferences');
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(true);
  const [digestFreq, setDigestFreq] = useState('daily');
  const [activeTemplate, setActiveTemplate] = useState(0);

  const events = [
    { id: 'ev1', name: 'Session Finalized (ERP Sync)', defaultInApp: true },
    { id: 'ev2', name: 'Faculty Review Required (Low Confidence)', defaultInApp: true },
    { id: 'ev3', name: 'Defaulter Risk Warning (< 75% cutoff)', defaultInApp: true },
    { id: 'ev4', name: 'Student Leave Request Submitted (D15)', defaultInApp: true },
    { id: 'ev5', name: 'Attendance Dispute Raised (D16)', defaultInApp: true },
    { id: 'ev6', name: 'System Camera Offline / Degraded (D08)', defaultInApp: true },
  ];

  const templates = [
    {
      id: 't1',
      title: 'Daily Classroom Attendance Summary',
      subject: '[ClassSight] CS-101 Section A Attendance Summary — 09 Nov',
      recipient: 'Course Faculty & Department HOD',
      preview: `Dear Dr. Sharma,

Today's attendance for CS-101 (Data Structures, Period 2) has been confirmed and finalized.
• Total Enrolled: 48 students
• Present (AUTO): 42 students (96% avg confidence)
• Confirmed via Faculty Review: 3 students
• Marked Absent: 3 students (Roll: CS-04, CS-12, CS-29)

Audit Log Record: cs-session-20261109-101. Finalized at 10:04 AM.
Single-capture attendance cannot be committed without the faculty review call; multi-shot finalise can finalise a clean accumulator by explicit faculty action.`,
    },
    {
      id: 't2',
      title: 'Low Attendance Defaulter Warning (<75%)',
      subject: 'URGENT: Academic Attendance Below 75% Cutoff — CS-101',
      recipient: 'Student (Aarav Patel) & Registered Guardian',
      preview: `Dear Aarav Patel (and Parent / Guardian),

This is an automated academic alert from the Department of Computer Science.
Your cumulative attendance in CS-101 has dropped to 72.4%, which is below the mandatory 75% institutional cutoff for semester exam eligibility.

• Classes Conducted: 29
• Classes Attended: 21
• Classes Needed to Regain 75%: 4 consecutive classes without absence.

Use the Eligibility Calculator in the Student Portal (portal/eligibility) to model your schedule, or submit a medical condonation request if eligible.`,
    },
    {
      id: 't3',
      title: 'Faculty Review Required Notification',
      subject: 'Action Required: 3 Pending Reviews for CS-101 Morning Session',
      recipient: 'Course Instructor',
      preview: `Dear Faculty Member,

The camera capture for Room 302 (CS-101, 09:00–10:00 AM) produced 3 uncertain face detections requiring your confirmation:
1. Row 3, Desk 4: 81.2% match (Rohan Gupta)
2. Row 2, Desk 1: Partial occlusion (Sneha Rao)
3. Row 5, Desk 2: Unknown face detected

Please open your review queue within the 24-hour review window:
Open Faculty Workspace: classsight.internal/app/review/104`,
    },
    {
      id: 't4',
      title: 'Student Leave / Condonation Submitted',
      subject: 'Medical Leave Application Received — Roll CS-04',
      recipient: 'Academic Dean / Course Faculty',
      preview: `Dear Academic Office,

Student Ananya Roy (Roll: 2026-CS-04) has submitted a leave application for dates 07 Nov – 08 Nov (2 academic days).
• Reason: Verified Medical Leave (Hospital Slip Uploaded)
• Impacted Sessions: MATH-101 (2 hours), CS-101 (2 hours)
• Document Attached: medical-cert-scan.pdf

Please review the attached evidence in the Admin Console (admin/leave) to approve excused absence condonation.`,
    },
    {
      id: 't5',
      title: 'Attendance Dispute Raised ("I Was Present")',
      subject: 'Dispute Contested: Session #19 (CS-101, 07 Nov)',
      recipient: 'Course Instructor & HOD',
      preview: `Dear Faculty,

Student Rohan Gupta has submitted an attendance dispute contesting an ABSENT mark for Session #19 (07 Nov, 09:00 AM).
• Student Note: "I was present in Row 4, next to Aarav Patel. My face may have been tilted during the wide-angle camera shot."
• Historical Session Frame: Cached frame 19-crop-desk4.jpg available for re-inspection.

Review dispute resolution in workspace: app/teacher/disputes`,
    },
    {
      id: 't6',
      title: 'Biometric Consent & Privacy Receipt (D20)',
      subject: 'ClassSight Biometric Enrollment Receipt — Academic Year 2026-27',
      recipient: 'Student & Guardian',
      preview: `Dear Student / Legal Guardian,

This email confirms that facial feature template enrollment has been completed for your academic attendance profile.
• Template Type: 128-dimensional numerical feature embedding vector.
• Raw Photos Stored: None (deleted following embedding extraction).
• Security Note: Face embeddings are not yet encrypted at rest.
• Retention Period: Current academic year + 6 months, after which records are purged.
• Data Rights: You may request complete erasure or inspect your Privacy Receipt anytime at /portal/privacy-receipt.`,
    },
  ];

  return (
    <div style={{ marginTop: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>
          Delivery Channels & Message Templates
        </h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className={`cs-button ${activeTab === 'preferences' ? 'button-primary' : 'button-secondary'} button-sm`}
            onClick={() => setActiveTab('preferences')}
          >
            Channel Preferences Matrix
          </button>
          <button
            type="button"
            className={`cs-button ${activeTab === 'templates' ? 'button-primary' : 'button-secondary'} button-sm`}
            onClick={() => setActiveTab('templates')}
          >
            Email Template Previews (6)
          </button>
        </div>
      </div>

      {activeTab === 'preferences' && (
        <Card style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 4px' }}>
                Event × Channel Routing Matrix
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                Configure which channels fire for each attendance lifecycle event.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: '600', marginRight: '8px' }}>Digest Frequency:</span>
                <select
                  value={digestFreq}
                  onChange={(e) => setDigestFreq(e.target.value)}
                  className="cs-select"
                  style={{ padding: '4px 8px', fontSize: '12px' }}
                >
                  <option value="realtime">Real-time alerts</option>
                  <option value="daily">Daily summary digest</option>
                  <option value="weekly">Weekly digest</option>
                </select>
              </div>
              <Switch
                label="Quiet Hours (21:00 – 07:00)"
                description="Suppress SMS/WhatsApp alerts at night"
                checked={quietHoursEnabled}
                onChange={(e) => setQuietHoursEnabled(e.target.checked)}
              />
            </div>
          </div>

          <div className="cs-datatable-container">
            <div className="cs-datatable-scroll">
              <table className="cs-datatable">
                <thead>
                  <tr>
                    <th>Event Category</th>
                    <th style={{ textAlign: 'center', width: '130px' }}>In-App (Wired)</th>
                    <th style={{ textAlign: 'center', width: '140px' }}>
                      Email <Badge variant="neutral" size="sm">Preview</Badge>
                    </th>
                    <th style={{ textAlign: 'center', width: '140px' }}>
                      SMS <Badge variant="neutral" size="sm">Coming Soon</Badge>
                    </th>
                    <th style={{ textAlign: 'center', width: '150px' }}>
                      WhatsApp <Badge variant="neutral" size="sm">Coming Soon</Badge>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((ev) => (
                    <tr key={ev.id}>
                      <td><strong>{ev.name}</strong></td>
                      <td style={{ textAlign: 'center' }}>
                        <input type="checkbox" defaultChecked aria-label={`Enable In-App for ${ev.name}`} />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input type="checkbox" defaultChecked aria-label={`Enable Email for ${ev.name}`} />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input type="checkbox" aria-label={`Enable SMS for ${ev.name}`} />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input type="checkbox" aria-label={`Enable WhatsApp for ${ev.name}`} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'templates' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1fr) 2fr', gap: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {templates.map((tpl, idx) => (
              <button
                key={tpl.id}
                type="button"
                className={`cs-button ${activeTemplate === idx ? 'button-secondary' : 'button-ghost'}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  textAlign: 'left',
                  padding: '12px 14px',
                  border: activeTemplate === idx ? '1.5px solid var(--lagoon-600)' : '1px solid var(--line)',
                  borderRadius: 'var(--radius-sm)',
                }}
                onClick={() => setActiveTemplate(idx)}
              >
                <strong style={{ fontSize: '13px', color: 'var(--text)' }}>{tpl.title}</strong>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  To: {tpl.recipient}
                </span>
              </button>
            ))}
          </div>

          <Card style={{ padding: '24px' }}>
            <span className="cs-eyebrow">Email Template Preview</span>
            <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '4px 0 12px' }}>
              {templates[activeTemplate].title}
            </h3>
            <div style={{ backgroundColor: 'var(--surface-raised)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', fontSize: '12px', marginBottom: '16px' }}>
              <div><strong>Subject:</strong> {templates[activeTemplate].subject}</div>
              <div><strong>Audience:</strong> {templates[activeTemplate].recipient}</div>
            </div>
            <pre
              style={{
                backgroundColor: 'var(--surface-subtle)',
                padding: '16px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                lineHeight: '1.6',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                border: '1px solid var(--line)',
                margin: 0,
              }}
            >
              {templates[activeTemplate].preview}
            </pre>
          </Card>
        </div>
      )}
    </div>
  );
}

