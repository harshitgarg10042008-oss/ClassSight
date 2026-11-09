'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AuthShell } from '@/components/shell/AuthShell';
import { Button } from '@/components/ui/Button';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Banner } from '@/components/ui/NavigationAndFeedback';
import { submitForm } from '@/lib/forms';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await submitForm({ action: 'reset_password', password });
      setMessage(res.message);
    } catch {
      setMessage('Demo mode, nothing was sent.');
    } finally {
      setBusy(false);
      setSubmitted(true);
    }
  }

  return (
    <AuthShell
      badge="Security Update"
      title="Set a new password"
      subtitle="Ensure your new password meets institutional complexity standards."
      footerLink={{
        text: 'Ready to sign in?',
        href: '/login',
        actionText: 'Back to Sign In',
      }}
    >
      <Banner
        type="sample"
        message="UI Preview — Backend password update is not connected. Submission ends in demo result."
      />

      <div style={{ marginTop: '20px' }}>
        {submitted ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔒</div>
            <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>Password Updated</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              {message}
            </p>
            <Link href="/login" className="cs-button button-primary button-wide">
              Proceed to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <PasswordInput
              id="reset-pw"
              label="New Password"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              showStrength
              required
              disabled={busy}
            />
            <PasswordInput
              id="reset-confirm-pw"
              label="Confirm New Password"
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
              Update Password
            </Button>
          </form>
        )}
      </div>
    </AuthShell>
  );
}
