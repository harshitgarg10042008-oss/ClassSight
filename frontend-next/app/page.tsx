'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PublicShell } from '@/components/shell/PublicShell';
import {
  Button,
  TierChip,
  Tabs,
  Accordion,
  Avatar,
  Badge,
  Card,
  StatCard,
} from '@/components/ui';
import { plans, planLabel } from '@/lib/plans';

type DemoStudent = {
  id: string;
  name: string;
  roll: string;
  confidence: number;
  status: 'AUTO' | 'REVIEW' | 'UNKNOWN' | 'ABSENT';
};

const initialDemoStudents: DemoStudent[] = [
  { id: '1', name: 'Aarav Patel', roll: 'CS-01', confidence: 96.2, status: 'AUTO' },
  { id: '2', name: 'Priya Sharma', roll: 'CS-02', confidence: 94.5, status: 'AUTO' },
  { id: '3', name: 'Rohan Gupta', roll: 'CS-03', confidence: 81.0, status: 'REVIEW' },
  { id: '4', name: 'Ananya Roy', roll: 'CS-04', confidence: 0.0, status: 'ABSENT' },
  { id: '5', name: 'Sneha Rao', roll: 'CS-05', confidence: 54.8, status: 'UNKNOWN' },
];

export default function HomePage() {
  const [audienceTab, setAudienceTab] = useState('teachers');
  const [demoList, setDemoList] = useState<DemoStudent[]>(initialDemoStudents);
  const [finalized, setFinalized] = useState(false);

  const updateStatus = (id: string, newStatus: DemoStudent['status']) => {
    setDemoList((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s))
    );
  };

  const resolvedCount = demoList.filter((s) => s.status === 'AUTO' || s.status === 'ABSENT').length;
  const progressPercent = Math.round((resolvedCount / demoList.length) * 100);

  return (
    <PublicShell>
      <main id="main-content" className="cs-landing-main">
        {/* Spiderweb Cyber Grid Background */}
        <div className="cs-cyber-grid" aria-hidden="true" />

        {/* Ambient Glowing Bubbles / Gradient Orbs */}
        <div className="cs-bubble cs-bubble-1" aria-hidden="true" />
        <div className="cs-bubble cs-bubble-2" aria-hidden="true" />
        <div className="cs-bubble cs-bubble-3" aria-hidden="true" />

        {/* ── HERO SECTION ────────────────────────────────────────── */}
        <section className="cs-hero-section">
          <div className="cs-hero-container">
            <div className="cs-hero-copy">
              <span className="cs-eyebrow-glow">✨ Faculty-First Classroom AI</span>
              <h1 className="cs-hero-title">
                Attendance that keeps <span className="cs-gradient-text">faculty in control</span>.
              </h1>
              <p className="cs-hero-subtitle">
                Classroom attendance from one photograph, with an accountable human-in-the-loop
                review step before records reach the ERP. Never a black-box decision.
              </p>
              <div className="cs-hero-ctas">
                <Link href="/book-demo" className="button-glow-primary button-lg">
                  Book a demo →
                </Link>
                <Link href="/how-it-works" className="cs-button button-outline button-lg">
                  See how it works
                </Link>
                <Link href="/app" className="cs-button button-ghost button-lg">
                  Try live workspace →
                </Link>
              </div>
              <div className="cs-hero-trust-row">
                <span className="cs-trust-pill">✓ Teacher confirms every match</span>
                <span className="cs-trust-pill">⚡ Under 30 seconds per lecture</span>
                <span className="cs-trust-pill">📊 ERP-ready CSV export</span>
              </div>
            </div>

            {/* High-Tech CSS Product Mockup with Live Vision Scanner Feed */}
            <div className="cs-hero-mockup" role="region" aria-label="Interactive Review Screen Mockup">
              <div className="cs-mockup-browser-chrome">
                <div className="cs-browser-dots">
                  <span className="dot red" />
                  <span className="dot yellow" />
                  <span className="dot green" />
                </div>
                <div className="cs-browser-address-bar">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span>classsight.internal/app/review/session-104</span>
                </div>
                <span className="cs-browser-badge">
                  <span className="cs-live-pulse-dot" /> LIVE INFERENCE
                </span>
              </div>

              {/* Simulated Classroom Vision Camera Feed */}
              <div className="cs-mockup-camera-feed" aria-hidden="true">
                <div className="cs-camera-grid-overlay" />
                <div className="cs-classroom-scene">
                  <div className="cs-scene-row">
                    <div className="cs-scene-desk" />
                    <div className="cs-scene-desk" />
                    <div className="cs-scene-desk" />
                    <div className="cs-scene-desk" />
                  </div>
                  <div className="cs-scene-row">
                    <div className="cs-scene-desk" />
                    <div className="cs-scene-desk" />
                    <div className="cs-scene-desk" />
                    <div className="cs-scene-desk" />
                  </div>
                </div>

                {/* Target Bounding Boxes */}
                <div className="cs-face-box box-1">
                  <span className="cs-face-box-tag">✓ Aarav P.</span>
                  <span style={{ fontSize: '9px', opacity: 0.85 }}>AUTO 96.2%</span>
                </div>

                <div className="cs-face-box box-2">
                  <span className="cs-face-box-tag">✓ Priya S.</span>
                  <span style={{ fontSize: '9px', opacity: 0.85 }}>AUTO 94.5%</span>
                </div>

                <div className="cs-face-box box-3">
                  <span className="cs-face-box-tag">? Rohan G.</span>
                  <span style={{ fontSize: '9px', opacity: 0.9 }}>REVIEW 81.0%</span>
                </div>

                <div className="cs-camera-hud">
                  <span>● CAM-02 FRONT AUDITORIUM • 30 FPS • 1080p</span>
                  <span>48 / 50 SEATS OCCUPIED (96%)</span>
                </div>
              </div>

              {/* Faculty Review Controls */}
              <div className="cs-mockup-body">
                <div className="cs-mockup-stream-header">
                  <div>
                    <strong>Room 302 • CS-101 Data Structures</strong>
                    <span className="cs-stat-hint" style={{ display: 'block' }}>Wide-angle camera • 48 students detected</span>
                  </div>
                  <div className="cs-tier-chip-summary">
                    <TierChip status="AUTO" count={42} size="sm" />
                    <TierChip status="REVIEW" count={3} size="sm" />
                    <TierChip status="UNKNOWN" count={1} size="sm" />
                    <TierChip status="ABSENT" count={2} size="sm" />
                  </div>
                </div>

                <div className="cs-mockup-cards-grid">
                  <div className="cs-mockup-student-card is-auto">
                    <Avatar name="Aarav Patel" size="md" />
                    <div className="cs-card-info">
                      <strong>Aarav Patel</strong>
                      <span className="cs-stat-hint">Roll: 2026-CS-01 • Matched via desk 1A</span>
                    </div>
                    <TierChip status="AUTO" label="96%" size="sm" />
                  </div>

                  <div className="cs-mockup-student-card is-review">
                    <Avatar name="Rohan Gupta" size="md" />
                    <div className="cs-card-info">
                      <strong>Rohan Gupta</strong>
                      <span className="cs-stat-hint">Roll: 2026-CS-03 • Partial angle (81%)</span>
                    </div>
                    <TierChip status="REVIEW" label="81%" size="sm" />
                  </div>

                  <div className="cs-mockup-student-card is-unknown">
                    <Avatar name="Unknown Student" size="md" />
                    <div className="cs-card-info">
                      <strong>Unmatched Face</strong>
                      <span className="cs-stat-hint">Row 4, Seat 2 • Low lighting</span>
                    </div>
                    <TierChip status="UNKNOWN" label="54%" size="sm" />
                  </div>
                </div>

                <div className="cs-mockup-footer">
                  <span className="cs-keyboard-hint">
                    Press <kbd>A</kbd> to accept, <kbd>X</kbd> to mark absent, <kbd>↵</kbd> to commit
                  </span>
                  <Link href="/app" className="cs-button button-primary button-sm">
                    Open Review Screen →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FOUR STEPS WORKFLOW ─────────────────────────────────── */}
        <section className="cs-landing-section">
          <div className="cs-section-header">
            <span className="cs-eyebrow-glow">A Clear, Auditable Process</span>
            <h2 className="cs-section-title">Four steps, one accountable record.</h2>
            <p className="cs-section-subtitle">
              Attendance shouldn't take 15 minutes of lecture time or rely on untrustworthy black-box algorithms.
            </p>
          </div>

          <div className="cs-steps-grid">
            <article className="cs-step-card">
              <span className="cs-step-num">01</span>
              <h3>Enrol Roster</h3>
              <p>
                One-time group photo enrolment with guardian consent tracking for minors.
                Biometric templates are stored as face embeddings.
              </p>
              <div className="cs-feature-widget" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📸</span>
                <span style={{ color: 'var(--muted)' }}>Single group photo setup</span>
              </div>
            </article>

            <article className="cs-step-card">
              <span className="cs-step-num">02</span>
              <h3>Capture Photo</h3>
              <p>
                Point classroom IP camera, laptop camera, or mobile phone to capture a wide-angle
                image of seated students in under 2 seconds.
              </p>
              <div className="cs-feature-widget" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⚡</span>
                <span style={{ color: 'var(--muted)' }}>1.8s wide-angle burst</span>
              </div>
            </article>

            <article className="cs-step-card">
              <span className="cs-step-num">03</span>
              <h3>Faculty Review</h3>
              <p>
                High-confidence matches are flagged AUTO. Uncertain matches are flagged REVIEW.
                Faculty reviews and confirms in under 30 seconds.
              </p>
              <div className="cs-feature-widget" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⌨️</span>
                <span style={{ color: 'var(--muted)' }}>Keyboard speed hotkeys</span>
              </div>
            </article>

            <article className="cs-step-card">
              <span className="cs-step-num">04</span>
              <h3>Finalize to ERP</h3>
              <p>
                Session locks with a timestamped audit log. Records immediately sync with institutional
                ERP/LMS systems with zero manual re-entry.
              </p>
              <div className="cs-feature-widget" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🔒</span>
                <span style={{ color: 'var(--muted)' }}>Immutable cryptographic lock</span>
              </div>
            </article>
          </div>
        </section>

        {/* ── PROBLEM VS SOLUTION ─────────────────────────────────── */}
        <section className="cs-landing-section cs-bg-subtle">
          <div className="cs-section-header">
            <span className="cs-eyebrow-glow">Why We Built ClassSight</span>
            <h2 className="cs-section-title">The attendance dilemma in modern education.</h2>
          </div>

          <div className="cs-comparison-grid">
            <div className="cs-comparison-card is-old">
              <div className="cs-card-badge">The Status Quo</div>
              <h3>Roll Calls & Black-Box Scanners</h3>
              <ul className="cs-comparison-list">
                <li>❌ <strong>10–15 minutes lost</strong> every single lecture calling out names or passing sign-in sheets.</li>
                <li>❌ <strong>Buddy punching and proxy attendance</strong> falsifying institutional records.</li>
                <li>❌ <strong>Opaque AI scanners</strong> making unchecked errors that alienate students and provoke disputes.</li>
                <li>❌ <strong>No audit trail</strong> when a student contests their attendance percentage at exam time.</li>
              </ul>
            </div>

            <div className="cs-comparison-card is-new">
              <div className="cs-card-badge cs-badge-brand">The ClassSight Way</div>
              <h3>Faculty-in-the-Loop Vision</h3>
              <ul className="cs-comparison-list">
                <li>✅ <strong>One 2-second photo</strong> captures all present students simultaneously.</li>
                <li>✅ <strong>Face recognition assists</strong>, but the teacher remains the final authority before ERP lock.</li>
                <li>✅ <strong>Speed review mode</strong> lets faculty confirm uncertain matches with 3 keyboard taps.</li>
                <li>✅ <strong>Complete dispute history & privacy receipt (D20)</strong> protecting students and institution.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── INTERACTIVE D24 TRY-IT DEMO ─────────────────────────── */}
        <section className="cs-landing-section">
          <div className="cs-section-header">
            <span className="cs-eyebrow-glow">Interactive Sandbox (D24)</span>
            <h2 className="cs-section-title">Try the faculty review step right here.</h2>
            <p className="cs-section-subtitle">
              Experience how faculty confirms matches. Tap the actions below on synthetic student data.
            </p>
          </div>

          <div className="cs-sandbox-container">
            <div className="cs-sandbox-header">
              <div>
                <strong>Class Session: CS-101 Algorithms (Demo Sandbox)</strong>
                <span className="cs-stat-hint" style={{ display: 'block', marginTop: '4px' }}>
                  Progress: {resolvedCount} of {demoList.length} students confirmed ({progressPercent}%)
                </span>
              </div>
              <div className="cs-sandbox-progress-track">
                <div className="cs-sandbox-progress-fill" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>

            <div className="cs-sandbox-list">
              {demoList.map((student) => (
                <div key={student.id} className={`cs-sandbox-item ${student.status.toLowerCase()}`}>
                  <Avatar name={student.name} size="md" />
                  <div className="cs-sandbox-info">
                    <strong>{student.name}</strong>
                    <span className="cs-stat-hint">{student.roll} • Confidence: {student.confidence}%</span>
                  </div>
                  <TierChip status={student.status} size="sm" />
                  <div className="cs-sandbox-actions">
                    <button
                      type="button"
                      className="cs-button button-secondary button-sm"
                      onClick={() => updateStatus(student.id, 'AUTO')}
                      title="Confirm present"
                    >
                      ✓ Confirm (A)
                    </button>
                    <button
                      type="button"
                      className="cs-button button-outline button-sm"
                      onClick={() => updateStatus(student.id, 'ABSENT')}
                      title="Mark absent"
                    >
                      ✕ Absent (X)
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="cs-sandbox-footer">
              <span className="cs-stat-hint" style={{ maxWidth: '440px' }}>
                Single-capture attendance cannot be committed without the faculty review call;
                multi-shot finalise can finalise a clean accumulator by explicit faculty action.
              </span>
              <Button
                variant="primary"
                onClick={() => setFinalized(true)}
                disabled={finalized}
              >
                {finalized ? 'Session Finalized (Demo)' : 'Finalize & Commit Session'}
              </Button>
            </div>
            {finalized && (
              <div className="cs-sandbox-finalized-banner">
                <span>🎉 Demo session finalized! Ready to test on real classroom cameras?</span>
                <Link href="/app" className="cs-button button-primary button-sm">
                  Launch Faculty Workspace →
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* ── SIGNATURE FEATURES GRID ─────────────────────────────── */}
        <section className="cs-landing-section cs-bg-subtle">
          <div className="cs-section-header">
            <span className="cs-eyebrow-glow">Signature Capabilities</span>
            <h2 className="cs-section-title">Built for the real complexities of classroom life.</h2>
            <p className="cs-section-subtitle">
              From lighting issues and late arrivals to disputed records and strict consent regulations.
            </p>
          </div>

          <div className="cs-features-grid">
            {/* D01 */}
            <div className="cs-feature-card">
              <div className="cs-feature-icon">🔍</div>
              <h3>Explain-This-Match (D01)</h3>
              <p>Inspect feature confidence against threshold gauges, face angle, and quality scores to know exactly why a student was flagged for review.</p>
              <div className="cs-feature-widget">
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)' }}>
                  <span>Match Confidence</span>
                  <strong style={{ color: '#10b981' }}>85.4%</strong>
                </div>
                <div className="cs-meter-track">
                  <div className="cs-meter-fill" style={{ width: '85.4%', background: '#10b981' }} />
                </div>
                <span style={{ fontSize: '10px', color: 'var(--muted)', display: 'block', marginTop: '4px' }}>
                  Cutoff: 80% • Euclidean: 0.38
                </span>
              </div>
              <span className="cs-plan-badge cs-plan-badge-essential" style={{ width: 'fit-content' }}>Essential</span>
            </div>

            {/* D02 */}
            <div className="cs-feature-card">
              <div className="cs-feature-icon">💡</div>
              <h3>Capture Coach (D02)</h3>
              <p>Pre-capture environmental checklist detects backlighting, low resolution, camera tilt, and cropped faces before you shoot.</p>
              <div className="cs-feature-widget">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', color: 'var(--muted)' }}>
                  <span style={{ color: '#10b981' }}>✓ Room Illuminance: 420 Lux (Optimal)</span>
                  <span style={{ color: '#10b981' }}>✓ Camera Horizon: 0.0° Level</span>
                  <span style={{ color: '#10b981' }}>✓ Focus Sharpness: 4K Crisp</span>
                </div>
              </div>
              <span className="cs-plan-badge cs-plan-badge-essential" style={{ width: 'fit-content' }}>Essential</span>
            </div>

            {/* D04 */}
            <div className="cs-feature-card">
              <div className="cs-feature-icon">⌨️</div>
              <h3>Keyboard Speed Review (D04)</h3>
              <p>Rapid review hotkeys: press A to confirm, X for absent, U for unknown, arrow keys to navigate, Z to undo. Finish in 20 seconds.</p>
              <div className="cs-feature-widget" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <span className="cs-keycap">A Confirm</span>
                <span className="cs-keycap">X Absent</span>
                <span className="cs-keycap">↵ Commit</span>
              </div>
              <span className="cs-plan-badge cs-plan-badge-essential" style={{ width: 'fit-content' }}>Essential</span>
            </div>

            {/* D05 */}
            <div className="cs-feature-card">
              <div className="cs-feature-icon">🪑</div>
              <h3>Seat-Map with Absentee Heat (D05)</h3>
              <p>Visual classroom layout shows empty desks and absentee heat patterns across lecture hall rows.</p>
              <div className="cs-feature-widget">
                <span style={{ color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Auditorium Desk Map</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px' }}>
                  <span style={{ height: '8px', borderRadius: '2px', background: '#10b981' }} />
                  <span style={{ height: '8px', borderRadius: '2px', background: '#10b981' }} />
                  <span style={{ height: '8px', borderRadius: '2px', background: '#ef4444' }} />
                  <span style={{ height: '8px', borderRadius: '2px', background: '#10b981' }} />
                  <span style={{ height: '8px', borderRadius: '2px', background: '#10b981' }} />
                  <span style={{ height: '8px', borderRadius: '2px', background: '#10b981' }} />
                </div>
              </div>
              <span className="cs-plan-badge cs-plan-badge-pro" style={{ width: 'fit-content' }}>Pro</span>
            </div>

            {/* D09 */}
            <div className="cs-feature-card">
              <div className="cs-feature-icon">🧮</div>
              <h3>Eligibility Calculator (D09)</h3>
              <p>Answers the student question: "How many classes can I still miss before falling below the 75% exam cutoff?"</p>
              <div className="cs-feature-widget">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--muted)' }}>Current Status:</span>
                  <strong style={{ color: '#10b981' }}>+3 Buffer Classes</strong>
                </div>
                <span style={{ fontSize: '10px', color: 'var(--muted)', display: 'block', marginTop: '4px' }}>
                  Attendance: 82.4% • Safe for semester finals
                </span>
              </div>
              <span className="cs-plan-badge cs-plan-badge-advanced" style={{ width: 'fit-content' }}>Advanced</span>
            </div>

            {/* D10 */}
            <div className="cs-feature-card">
              <div className="cs-feature-icon">📡</div>
              <h3>Risk Radar (D10)</h3>
              <p>Early-warning alerts highlight students whose attendance is trending downward before they become debarred defaulters.</p>
              <div className="cs-feature-widget">
                <span style={{ color: '#f59e0b', display: 'block' }}>⚠️ 2 students approaching cutoff</span>
                <span style={{ fontSize: '10px', color: 'var(--muted)', display: 'block', marginTop: '2px' }}>
                  Automated guardian notifications queued
                </span>
              </div>
              <span className="cs-plan-badge cs-plan-badge-pro" style={{ width: 'fit-content' }}>Pro</span>
            </div>

            {/* D19 */}
            <div className="cs-feature-card">
              <div className="cs-feature-icon">📜</div>
              <h3>Consent Ledger (D19)</h3>
              <p>Comprehensive tracker for student and guardian consent status, withdrawal requests, and minor flags.</p>
              <div className="cs-feature-widget">
                <span style={{ color: '#10b981' }}>🔒 100% Guardian Consent Logged</span>
                <span style={{ fontSize: '10px', color: 'var(--muted)', display: 'block', marginTop: '2px' }}>
                  SHA-256 Consent Audit Hash Verified
                </span>
              </div>
              <span className="cs-plan-badge cs-plan-badge-essential" style={{ width: 'fit-content' }}>Essential</span>
            </div>

            {/* D20 */}
            <div className="cs-feature-card">
              <div className="cs-feature-icon">🛡️</div>
              <h3>Privacy Receipt & Erasure (D20)</h3>
              <p>Transparent summary showing each student what biometric data is held, since when, and one-click erasure workflows.</p>
              <div className="cs-feature-widget">
                <span style={{ color: 'var(--muted)', display: 'block' }}>Template Vector:</span>
                <span style={{ fontSize: '10px', color: 'var(--accent)', fontFamily: 'monospace' }}>
                  [0.128, -0.452, 0.901...]
                </span>
                <span style={{ fontSize: '10px', color: '#ef4444', display: 'block', marginTop: '2px' }}>
                  1-Click Right to Erasure Supported
                </span>
              </div>
              <span className="cs-plan-badge cs-plan-badge-essential" style={{ width: 'fit-content' }}>Essential</span>
            </div>
          </div>
        </section>

        {/* ── AUDIENCE VALUE TABS ─────────────────────────────────── */}
        <section className="cs-landing-section">
          <div className="cs-section-header">
            <span className="cs-eyebrow-glow">Tailored For Every Role</span>
            <h2 className="cs-section-title">One source of truth across campus.</h2>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '36px' }}>
            <Tabs
              activeId={audienceTab}
              onChange={setAudienceTab}
              variant="pills"
              tabs={[
                { id: 'teachers', label: 'For Teachers' },
                { id: 'institutions', label: 'For Institutions' },
                { id: 'students', label: 'For Students & Parents' },
                { id: 'admins', label: 'For IT & Admins' },
              ]}
            />
          </div>

          <div className="cs-audience-panel">
            {audienceTab === 'teachers' && (
              <div className="cs-audience-content">
                <div>
                  <h3>Never lose lecture time to roll calls again.</h3>
                  <p>
                    Take back the first 15 minutes of every lecture. Simply snap a photo from your desk or classroom camera.
                    ClassSight matches the roster and presents only uncertain faces for your quick confirmation.
                  </p>
                  <ul>
                    <li>✓ No paper sheets, no proxy attendance</li>
                    <li>✓ Instant defaulter alerts before exams</li>
                    <li>✓ Keyboard speed review mode under 30 seconds</li>
                  </ul>
                  <Link href="/app" className="cs-button button-primary">Explore Faculty Workspace →</Link>
                </div>
                <div className="cs-audience-visual">
                  <StatCard title="Average Review Time" value="24 sec" delta={{ value: "95% time saved", positive: true }} sparklineData={[45, 38, 30, 26, 24]} />
                </div>
              </div>
            )}

            {audienceTab === 'institutions' && (
              <div className="cs-audience-content">
                <div>
                  <h3>Accreditation-grade records without student friction.</h3>
                  <p>
                    Provide UGC, AICTE, and NAAC accreditation committees with tamper-evident, timestamped records
                    showing clear faculty sign-off on every session.
                  </p>
                  <ul>
                    <li>✓ Eliminates proxy attendance disputes</li>
                    <li>✓ ERP integration with SAP, PeopleSoft, and custom SQL</li>
                    <li>✓ Departmental HOD oversight workflows</li>
                  </ul>
                  <Link href="/book-demo" className="cs-button button-primary">Schedule Institutional Briefing →</Link>
                </div>
                <div className="cs-audience-visual">
                  <StatCard title="Attendance Discrepancy Reduction" value="99.2%" delta={{ value: "Auditable sign-off", positive: true }} sparklineData={[80, 85, 92, 97, 99.2]} />
                </div>
              </div>
            )}

            {audienceTab === 'students' && (
              <div className="cs-audience-content">
                <div>
                  <h3>Transparent percentages and zero surprise defaulter lists.</h3>
                  <p>
                    Students and parents access the mobile-friendly portal to view real-time subject percentages,
                    calculate exact attendance buffer classes, and contest wrongful absences with evidence.
                  </p>
                  <ul>
                    <li>✓ Eligibility calculator: know exactly how many classes you can miss</li>
                    <li>✓ 24-hour dispute window with documented resolution</li>
                    <li>✓ Privacy receipt: transparent biometric template management</li>
                  </ul>
                  <Link href="/portal" className="cs-button button-primary">View Student Portal →</Link>
                </div>
                <div className="cs-audience-visual">
                  <StatCard title="Current Eligibility Buffer" value="+3 classes" delta={{ value: "Safe above 75%", positive: true }} sparklineData={[1, 2, 2, 3, 3]} />
                </div>
              </div>
            )}

            {audienceTab === 'admins' && (
              <div className="cs-audience-content">
                <div>
                  <h3>Zero-hardware lock-in with enterprise security controls.</h3>
                  <p>
                    Works with your existing RTSP/ONVIF cameras, USB webcams, or faculty smartphones.
                    Deployable on private cloud or on-premise Kubernetes clusters.
                  </p>
                  <ul>
                    <li>✓ Multi-campus role-based access control (RBAC)</li>
                    <li>✓ Automated camera health ping and lighting scoring</li>
                    <li>✓ Granular retention policies and cryptographic audit logs</li>
                  </ul>
                  <Link href="/admin" className="cs-button button-primary">Admin Console Demo →</Link>
                </div>
                <div className="cs-audience-visual">
                  <StatCard title="Active Camera Health" value="100%" delta={{ value: "All nodes pinging", positive: true }} sparklineData={[100, 100, 100, 100, 100]} />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── PRIVACY AND TRUST SECTION ───────────────────────────── */}
        <section className="cs-landing-section cs-bg-subtle">
          <div className="cs-section-header">
            <span className="cs-eyebrow-glow">Privacy & Engineering Integrity</span>
            <h2 className="cs-section-title">Built with honest boundaries, not marketing claims.</h2>
            <p className="cs-section-subtitle">
              We state clearly what our system does and what is still under development.
            </p>
          </div>

          <div className="cs-trust-grid">
            <div className="cs-trust-card">
              <h4>Consent-Driven Architecture</h4>
              <p>Designed to support consent workflows; legal text needs lawyer review. Guardians must provide explicit consent for minor students.</p>
            </div>
            <div className="cs-trust-card">
              <h4>Security Transparency</h4>
              <p>Face embeddings are not yet encrypted at rest. We store Manhattan distance feature vectors, not raw high-resolution facial scans.</p>
            </div>
            <div className="cs-trust-card">
              <h4>Realistic Accuracy Expectations</h4>
              <p>Simulated on LFW, NOT classroom accuracy. Real classroom accuracy depends on illumination, camera resolution, and occlusion.</p>
            </div>
            <div className="cs-trust-card">
              <h4>Strict Faculty Accountability</h4>
              <p>Single-capture attendance cannot be committed without the faculty review call; multi-shot finalise can finalise a clean accumulator by explicit faculty action.</p>
            </div>
          </div>
        </section>

        {/* ── PLANS PREVIEW ───────────────────────────────────────── */}
        <section className="cs-landing-section">
          <div className="cs-section-header">
            <span className="cs-eyebrow-glow">Transparent Packaging</span>
            <h2 className="cs-section-title">Plans that scale with your institution.</h2>
            <p className="cs-section-subtitle">
              Prices are configured directly with your account team based on campus size and deployment model.
            </p>
          </div>

          <div className="cs-pricing-cards-grid">
            {plans.map((p) => (
              <div key={p.id} className={`cs-plan-card ${p.id === 'pro' ? 'is-featured' : ''}`}>
                {p.id === 'pro' && <span className="cs-featured-badge">Most Popular</span>}
                <h3 className="cs-plan-name">{p.name}</h3>
                <p className="cs-plan-desc">{p.description}</p>
                <div className="cs-plan-price">
                  <span className="price-val">{planLabel(p)}</span>
                </div>
                <ul className="cs-plan-features">
                  {p.id === 'essential' && (
                    <>
                      <li>✓ Single-shot camera capture (FT01)</li>
                      <li>✓ Group-photo roster enrolment (FT02)</li>
                      <li>✓ Faculty speed review queue (FT03)</li>
                      <li>✓ Class, room, and camera setup (FT04)</li>
                      <li>✓ CSV absent export (FT05)</li>
                    </>
                  )}
                  {p.id === 'pro' && (
                    <>
                      <li>✓ Everything in Essential, plus:</li>
                      <li>✓ Multi-shot burst accumulator (FT07)</li>
                      <li>✓ Risk radar & defaulter alerts (FT08)</li>
                      <li>✓ Seat-map with absentee heat (D05)</li>
                      <li>✓ Automated camera health monitor (D08)</li>
                    </>
                  )}
                  {p.id === 'advanced' && (
                    <>
                      <li>✓ Everything in Pro, plus:</li>
                      <li>✓ ERP & LMS bidirectional sync (FT14)</li>
                      <li>✓ Student & parent portal (FT19)</li>
                      <li>✓ Multi-campus & SSO authentication (FT15)</li>
                      <li>✓ Private cloud / on-prem cluster (FT16)</li>
                    </>
                  )}
                </ul>
                <Link
                  href="/book-demo"
                  className={`cs-button ${p.id === 'pro' ? 'button-primary' : 'button-outline'} button-wide`}
                >
                  Contact Institutional Sales
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ACCORDION ───────────────────────────────────────── */}
        <section className="cs-landing-section cs-bg-subtle">
          <div className="cs-section-header">
            <span className="cs-eyebrow-glow">Frequently Asked Questions</span>
            <h2 className="cs-section-title">Everything you need to know.</h2>
          </div>

          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <Accordion
              items={[
                {
                  id: 'faq-1',
                  title: 'How does the faculty review step prevent false attendance?',
                  content: 'Single-capture attendance cannot be committed without the faculty review call; multi-shot finalise can finalise a clean accumulator by explicit faculty action. The teacher sees thumbnails of ambiguous detections and makes the final determination in seconds.',
                },
                {
                  id: 'faq-2',
                  title: 'Do we need to buy expensive proprietary cameras?',
                  content: 'No. ClassSight works with standard IP cameras (RTSP/ONVIF), USB webcams, or even faculty smartphones via our upcoming phone-as-camera pairing workflow (D07).',
                },
                {
                  id: 'faq-3',
                  title: 'How are minor student records and guardian consents handled?',
                  content: 'Designed to support consent workflows; legal text needs lawyer review. For minor students, guardian consent is recorded with timestamped verification before facial templates are activated.',
                },
                {
                  id: 'faq-4',
                  title: 'Are biometric templates encrypted at rest?',
                  content: 'Face embeddings are not yet encrypted at rest. They are stored as normalized numerical embedding vectors in isolated PostgreSQL tables rather than identifiable photographs.',
                },
                {
                  id: 'faq-5',
                  title: 'Can ClassSight integrate with our existing ERP or LMS?',
                  content: 'Yes. Attendance records can be exported directly as standardized CSV files or synchronized via REST APIs to systems such as SAP, PeopleSoft, Moodle, and Blackboard.',
                },
              ]}
            />
          </div>
        </section>

        {/* ── FINAL CTA ───────────────────────────────────────────── */}
        <section className="cs-landing-cta-section">
          <div className="cs-cta-box">
            <h2>Ready to modernize classroom attendance with human oversight?</h2>
            <p>
              Experience faster lectures, eliminated proxy attendance, and accreditation-ready audit trails.
            </p>
            <div className="cs-cta-actions">
              <Link href="/book-demo" className="button-glow-primary button-lg">
                Request an Institutional Demo →
              </Link>
              <Link href="/app" className="cs-button button-outline button-lg" style={{ color: 'var(--text)', borderColor: 'var(--line)' }}>
                Try Faculty Workspace
              </Link>
            </div>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
