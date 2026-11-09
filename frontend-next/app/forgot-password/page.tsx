'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AuthShell } from '@/components/shell/AuthShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/FormControls';
import { Banner } from '@/components/ui/NavigationAndFeedback';
import { submitForm } from '@/lib/forms';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await submitForm({ email, action: 'forgot_password' });
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
      badge="Account Recovery"
      title="Reset your password"
      subtitle="Enter your institutional email to receive recovery instructions."
      footerLink={{
        text: 'Remember your password?',
        href: '/login',
        actionText: 'Back to Sign In',
      }}
    >
      <Banner
        type="sample"
        message="UI Preview — Password recovery backend is not connected. Submission ends in demo result."
      />

      <div style={{ marginTop: '20px' }}>
        {submitted ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>✉️</div>
            <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>Instructions Sent</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              {message}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Check your inbox for <code>{email}</code>. If an account matches, a recovery link has been simulated.
            </p>
            <Link href="/login" className="cs-button button-primary button-wide">
              Return to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <Input
              id="forgot-email"
              type="email"
              label="Official Institutional Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="faculty@university.edu"
              required
              disabled={busy}
            />
            <Button type="submit" variant="primary" size="md" className="button-wide" loading={busy}>
              Send Recovery Instructions
            </Button>
          </form>
        )}
      </div>
    </AuthShell>
  );
}
