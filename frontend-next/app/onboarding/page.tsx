'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PublicShell } from '@/components/shell/PublicShell';
import {
  Button,
  Input,
  Select,
  Textarea,
  Checkbox,
  ProgressRing,
  Card,
  Banner,
} from '@/components/ui';

const STORAGE_KEY = 'classsight_onboarding_progress';

const checklistSteps = [
  { id: 1, title: 'Institution Profile', desc: 'Campus name, code, and academic terms' },
  { id: 2, title: 'Add Rooms & Cameras', desc: 'Teaching spaces and camera stream URLs' },
  { id: 3, title: 'Enrol First Class', desc: 'Section roster and group-photo setup' },
  { id: 4, title: 'Invite Teachers', desc: 'Faculty course assignments and credentials' },
  { id: 5, title: 'Set Consent Text', desc: 'Student and minor guardian consent notice' },
  { id: 6, title: 'Notification Preferences', desc: 'Attendance digests and defaulter alerts' },
];

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Form Fields
  const [instName, setInstName] = useState('Apex Institute of Technology');
  const [campusCode, setCampusCode] = useState('AIT-01');
  const [roomName, setRoomName] = useState('Lecture Hall 302');
  const [cameraType, setCameraType] = useState('rtsp');
  const [className, setClassName] = useState('CS-101 Data Structures');
  const [teacherEmail, setTeacherEmail] = useState('faculty1@apex.edu');
  const [consentDraft, setConsentDraft] = useState(
    'Students agree to facial feature matching for class attendance. Guardian consent is required for minors. Designed to support consent workflows; legal text needs lawyer review. Face embeddings are not yet encrypted at rest.'
  );
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyDefaulters, setNotifyDefaulters] = useState(true);

  // Restore from localStorage (try/catch)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.currentStep) setCurrentStep(parsed.currentStep);
        if (parsed.completedSteps) setCompletedSteps(parsed.completedSteps);
      }
    } catch {
      /* optional browser storage */
    }
  }, []);

  // Persist to localStorage (try/catch)
  const saveProgress = (stepNum: number, done: number[]) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ currentStep: stepNum, completedSteps: done })
      );
    } catch {
      /* optional browser storage */
    }
  };

  const markStepDone = (stepNum: number) => {
    const nextDone = Array.from(new Set([...completedSteps, stepNum]));
    setCompletedSteps(nextDone);
    const nextStep = Math.min(stepNum + 1, 6);
    setCurrentStep(nextStep);
    saveProgress(nextStep, nextDone);
  };

  const percentComplete = Math.round((completedSteps.length / 6) * 100);

  return (
    <PublicShell>
      <main id="main-content" className="cs-app-content" style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <span className="cs-eyebrow">Setup Wizard</span>
            <h1 className="cs-page-title" style={{ margin: '4px 0' }}>
              Institution Onboarding Checklist
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
              Complete these 6 foundational steps to prepare your first live classroom capture.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <ProgressRing value={percentComplete} size={70} strokeWidth={7} label="Done" />
            <div>
              <strong style={{ display: 'block', fontSize: '14px' }}>{completedSteps.length} of 6 steps</strong>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Progress saved locally</span>
            </div>
          </div>
        </header>

        <Banner
          type="sample"
          message="Resumable Onboarding Preview — Values are persisted in your browser's local storage."
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1fr) 2fr', gap: '32px', marginTop: '24px' }}>
          {/* Step List Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {checklistSteps.map((step) => {
              const isDone = completedSteps.includes(step.id);
              const isCurrent = currentStep === step.id;
              return (
                <button
                  key={step.id}
                  type="button"
                  className={`cs-button ${isCurrent ? 'button-secondary' : 'button-ghost'}`}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'flex-start',
                    textAlign: 'left',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: isCurrent ? '1.5px solid var(--lagoon-600)' : '1px solid transparent',
                  }}
                  onClick={() => setCurrentStep(step.id)}
                >
                  <span
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: isDone ? 'var(--tier-auto)' : isCurrent ? 'var(--lagoon-600)' : 'var(--line)',
                      color: isDone || isCurrent ? '#fff' : 'var(--text-muted)',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: '11px',
                      fontWeight: '800',
                      marginRight: '10px',
                      flexShrink: 0,
                    }}
                  >
                    {isDone ? '✓' : step.id}
                  </span>
                  <div>
                    <strong style={{ display: 'block', fontSize: '13px', color: 'var(--text)' }}>
                      {step.title}
                    </strong>
                    <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {step.desc}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Step Card */}
          <Card style={{ padding: '28px' }}>
            {currentStep === 1 && (
              <div>
                <span className="cs-eyebrow">Step 1 of 6</span>
                <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '4px 0 12px' }}>Institution Profile</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                  Register the official university identity used in ERP headers and audit exports.
                </p>
                <Input
                  label="Institution Full Legal Name"
                  value={instName}
                  onChange={(e) => setInstName(e.target.value)}
                />
                <Input
                  label="Campus / Node Identifier"
                  value={campusCode}
                  onChange={(e) => setCampusCode(e.target.value)}
                  hint="Used to partition multi-campus deployments"
                />
                <Button variant="primary" onClick={() => markStepDone(1)}>
                  Save & Continue to Spaces →
                </Button>
              </div>
            )}

            {currentStep === 2 && (
              <div>
                <span className="cs-eyebrow">Step 2 of 6</span>
                <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '4px 0 12px' }}>Add Rooms & Cameras</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                  Configure your primary lecture theatre and camera streaming protocol.
                </p>
                <Input
                  label="Room / Hall Name"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                />
                <Select
                  label="Camera Connection Type"
                  value={cameraType}
                  onChange={(e) => setCameraType(e.target.value)}
                  options={[
                    { value: 'rtsp', label: 'RTSP IP Camera (Wide Angle)' },
                    { value: 'usb', label: 'USB Faculty Webcam' },
                    { value: 'phone', label: 'Phone QR Pairing (D07)' },
                  ]}
                />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <Button variant="outline" onClick={() => setCurrentStep(1)}>← Back</Button>
                  <Button variant="primary" onClick={() => markStepDone(2)}>Save & Continue to Roster →</Button>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div>
                <span className="cs-eyebrow">Step 3 of 6</span>
                <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '4px 0 12px' }}>Enrol First Class Section</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                  Define the course roster for group-photo biometric registration.
                </p>
                <Input
                  label="Course / Section Title"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                />
                <div style={{ backgroundColor: 'var(--surface-raised)', padding: '16px', borderRadius: 'var(--radius-sm)', marginBottom: '20px' }}>
                  <strong>Quick Group-Photo Enrolment (FT02)</strong>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 10px' }}>
                    Once configured, you can take a single group photo of seated students to generate facial embeddings for the entire class simultaneously.
                  </p>
                  <Link href="/app/enrollment" className="cs-button button-outline button-sm">
                    Open Wired Enrolment Tool
                  </Link>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <Button variant="outline" onClick={() => setCurrentStep(2)}>← Back</Button>
                  <Button variant="primary" onClick={() => markStepDone(3)}>Save & Continue to Faculty →</Button>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div>
                <span className="cs-eyebrow">Step 4 of 6</span>
                <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '4px 0 12px' }}>Invite Teachers</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                  Provide access for classroom instructors to conduct 30-second reviews.
                </p>
                <Input
                  label="Faculty Email Address"
                  type="email"
                  value={teacherEmail}
                  onChange={(e) => setTeacherEmail(e.target.value)}
                />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <Button variant="outline" onClick={() => setCurrentStep(3)}>← Back</Button>
                  <Button variant="primary" onClick={() => markStepDone(4)}>Save & Continue to Consent →</Button>
                </div>
              </div>
            )}

            {currentStep === 5 && (
              <div>
                <span className="cs-eyebrow">Step 5 of 6</span>
                <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '4px 0 12px' }}>Set Consent Text (D19)</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                  Guardian consent is required for minors. Legal text needs lawyer review before institutional publication.
                </p>
                <Textarea
                  label="Biometric Enrollment Disclosure & Consent Notice"
                  value={consentDraft}
                  onChange={(e) => setConsentDraft(e.target.value)}
                  rows={4}
                />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <Button variant="outline" onClick={() => setCurrentStep(4)}>← Back</Button>
                  <Button variant="primary" onClick={() => markStepDone(5)}>Save & Continue to Alerts →</Button>
                </div>
              </div>
            )}

            {currentStep === 6 && (
              <div>
                <span className="cs-eyebrow">Step 6 of 6</span>
                <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '4px 0 12px' }}>Notification Preferences</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                  Configure delivery channels for daily session summaries and defaulter warnings.
                </p>
                <Checkbox
                  label="Email daily summary to department HOD"
                  checked={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.checked)}
                />
                <Checkbox
                  label="Trigger automated defaulter warning when attendance < 75%"
                  checked={notifyDefaulters}
                  onChange={(e) => setNotifyDefaulters(e.target.checked)}
                />
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <Button variant="outline" onClick={() => setCurrentStep(5)}>← Back</Button>
                  <Button variant="primary" onClick={() => markStepDone(6)}>
                    Finish Onboarding & Launch Workspace 🎉
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </main>
    </PublicShell>
  );
}
