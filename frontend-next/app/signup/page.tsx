'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AuthShell } from '@/components/shell/AuthShell';
import { Button } from '@/components/ui/Button';
import { Input, Select, RadioGroup } from '@/components/ui/FormControls';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Stepper } from '@/components/ui/NavigationAndFeedback';
import { Banner } from '@/components/ui/NavigationAndFeedback';
import { submitForm } from '@/lib/forms';

export default function SignupPage() {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [resultMessage, setResultMessage] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [institution, setInstitution] = useState('');
  const [campusType, setCampusType] = useState('college');
  const [role, setRole] = useState('faculty');
  const [selectedPlan, setSelectedPlan] = useState('pro');

  const steps = [
    { id: 'account', label: 'Account' },
    { id: 'institution', label: 'Institution' },
    { id: 'role', label: 'Role' },
    { id: 'plan', label: 'Plan' },
    { id: 'verify', label: 'Complete' },
  ];

  async function handleFinalSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResultMessage('');

    try {
      const res = await submitForm({
        name,
        email,
        institution,
        campusType,
        role,
        plan: selectedPlan,
      });
      setResultMessage(res.message);
      setStep(4);
    } catch {
      setResultMessage('Demo mode, nothing was sent.');
      setStep(4);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      badge="Onboarding Wizard"
      title="Create your institution account"
      subtitle="Set up faculty-in-the-loop classroom attendance for your department."
      footerLink={{
        text: 'Already have an account?',
        href: '/login',
        actionText: 'Sign In',
      }}
    >
      <div style={{ marginBottom: '20px' }}>
        <Stepper steps={steps} currentStep={step} />
      </div>

      <Banner
        type="sample"
        message="UI Preview — Backend provisioning is not yet connected. Submission ends in demo result."
      />

      <div style={{ marginTop: '20px' }}>
        {step === 0 && (
          <form onSubmit={(e) => { e.preventDefault(); setStep(1); }}>
            <Input
              id="signup-name"
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dr. Rajesh Sharma"
              required
            />
            <Input
              id="signup-email"
              type="email"
              label="Institutional Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="faculty@university.edu"
              hint="Use your official college or school address"
              required
            />
            <PasswordInput
              id="signup-password"
              label="Create Password"
              value={password}
              onChange={setPassword}
              showStrength
              required
            />
            <PasswordInput
              id="signup-confirm"
              label="Confirm Password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              confirmValue={password}
              required
            />
            <Button type="submit" variant="primary" className="button-wide" disabled={!name || !email || !password || password !== confirmPassword}>
              Next: Institution Details →
            </Button>
          </form>
        )}

        {step === 1 && (
          <form onSubmit={(e) => { e.preventDefault(); setStep(2); }}>
            <Input
              id="signup-inst"
              label="Institution or University Name"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder="e.g. National Institute of Technology"
              required
            />
            <Select
              id="signup-campus-type"
              label="Campus Category"
              value={campusType}
              onChange={(e) => setCampusType(e.target.value)}
              options={[
                { value: 'university', label: 'University / Autonomous Campus' },
                { value: 'college', label: 'Undergraduate Engineering / Arts College' },
                { value: 'school', label: 'K-12 School (Guardian consent required for minors)' },
                { value: 'coaching', label: 'Competitive Test Prep Institute' },
              ]}
            />
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <Button type="button" variant="outline" onClick={() => setStep(0)}>
                ← Back
              </Button>
              <Button type="submit" variant="primary" style={{ flex: 1 }} disabled={!institution}>
                Next: Role & Access →
              </Button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={(e) => { e.preventDefault(); setStep(3); }}>
            <RadioGroup
              name="role_selection"
              value={role}
              onChange={setRole}
              label="Your Primary Institutional Role"
              options={[
                { value: 'faculty', label: 'Classroom Faculty / Teacher', description: 'Take attendance and conduct 30-second reviews.' },
                { value: 'hod', label: 'Department Head / Academic Dean', description: 'Monitor department metrics and handle dispute escalations.' },
                { value: 'admin', label: 'IT Administrator / Registrar', description: 'Manage cameras, ERP connections, and user roles.' },
              ]}
            />
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                ← Back
              </Button>
              <Button type="submit" variant="primary" style={{ flex: 1 }}>
                Next: Select Plan →
              </Button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleFinalSubmit}>
            <RadioGroup
              name="plan_selection"
              value={selectedPlan}
              onChange={setSelectedPlan}
              label="Select Desired Service Tier"
              options={[
                { value: 'essential', label: 'Essential Tier', description: 'Single-shot camera capture and CSV export.' },
                { value: 'pro', label: 'Pro Tier (Recommended)', description: 'Multi-shot burst accumulator, Risk Radar, and seat map.' },
                { value: 'advanced', label: 'Advanced Tier', description: 'Bidirectional ERP/LMS sync, student portal, and custom hosting.' },
              ]}
            />
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <Button type="button" variant="outline" onClick={() => setStep(2)}>
                ← Back
              </Button>
              <Button type="submit" variant="primary" style={{ flex: 1 }} loading={busy}>
                Complete Setup & Review
              </Button>
            </div>
          </form>
        )}

        {step === 4 && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>📋</div>
            <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>Registration Summary</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              {resultMessage || 'Demo mode, nothing was sent.'}
            </p>
            <div style={{ backgroundColor: 'var(--surface-raised)', padding: '14px', borderRadius: 'var(--radius-sm)', textAlign: 'left', fontSize: '13px', marginBottom: '20px' }}>
              <div><strong>Name:</strong> {name || 'Dr. Sharma'}</div>
              <div><strong>Email:</strong> {email || 'faculty@university.edu'}</div>
              <div><strong>Institution:</strong> {institution || 'Engineering College'}</div>
              <div><strong>Tier:</strong> {selectedPlan.toUpperCase()}</div>
            </div>
            <Link href="/login" className="cs-button button-primary button-wide">
              Proceed to Sign In
            </Link>
          </div>
        )}
      </div>
    </AuthShell>
  );
}
