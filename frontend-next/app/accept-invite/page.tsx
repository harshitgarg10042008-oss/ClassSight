'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AuthShell } from '@/components/shell/AuthShell';
import { Button } from '@/components/ui/Button';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Banner } from '@/components/ui/NavigationAndFeedback';
import { submitForm } from '@/lib/forms';

export default function AcceptInvitePage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [message, setMessage] = useState('');

  async function handleAccept(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await submitForm({ action: 'accept_invite', password });
      setMessage(res.message);
    } catch {
      setMessage('Demo mode, nothing was sent.');
    } finally {
      setBusy(false);
      setAccepted(true);
    }
  }

  return (
    <AuthShell
      badge="Faculty Invitation"
      title="Join your department workspace"
      subtitle="You have been invited by your HOD to join ClassSight as a course instructor."
      footerLink={{
        text: 'Already have credentials?',
        href: '/login',
        actionText: 'Sign In',
      }}
    >
      <div style={{ backgroundColor: 'var(--surface-raised)', padding: '14px', borderRadius: 'var(--radius-sm)', marginBottom: '16px', fontSize: '13px' }}>
        <div><strong>Invited Department:</strong> Computer Science & Engineering</div>
        <div><strong>Role:</strong> Assistant Professor / Classroom Instructor</div>
        <div><strong>Assigned Section:</strong> CS-101 (Data Structures)</div>
      </div>

      <Banner
        type="sample"
        message="UI Preview — Department invite acceptance demo. Submission ends in demo result."
      />

      <div style={{ marginTop: '20px' }}>
        {accepted ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🤝</div>
            <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>Invitation Accepted</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              {message}
            </p>
            <Link href="/login" className="cs-button button-primary button-wide">
              Proceed to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleAccept}>
            <PasswordInput
              id="invite-pw"
              label="Create Your Password"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              showStrength
              required
              disabled={busy}
            />
            <PasswordInput
              id="invite-confirm"
              label="Confirm Password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
              confirmValue={password}
              required
              disabled={busy}
            />
            <Button
              type="submit"
              variant="primary"
              className="button-wide"
              loading={busy}
              disabled={!password || password !== confirmPassword}
            >
              Accept Invitation & Activate Access
            </Button>
          </form>
        )}
      </div>
    </AuthShell>
  );
}
