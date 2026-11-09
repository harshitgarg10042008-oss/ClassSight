'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AuthShell } from '@/components/shell/AuthShell';
import { Button } from '@/components/ui/Button';
import { OtpInput } from '@/components/ui/OtpInput';
import { Banner } from '@/components/ui/NavigationAndFeedback';
import { submitForm } from '@/lib/forms';

export default function VerifyEmailPage() {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);
  const [message, setMessage] = useState('');

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await submitForm({ action: 'verify_email', code });
      setMessage(res.message);
    } catch {
      setMessage('Demo mode, nothing was sent.');
    } finally {
      setBusy(false);
      setVerified(true);
    }
  }

  return (
    <AuthShell
      badge="Identity Verification"
      title="Verify your email"
      subtitle="Enter the 6-digit verification code sent to your institutional inbox."
      footerLink={{
        text: 'Wrong email address?',
        href: '/signup',
        actionText: 'Restart Registration',
      }}
    >
      <Banner
        type="sample"
        message="UI Preview — Email verification is simulated. Form posts to adapter or returns demo result."
      />

      <div style={{ marginTop: '20px' }}>
        {verified ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>✅</div>
            <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>Email Verified</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              {message}
            </p>
            <Link href="/onboarding" className="cs-button button-primary button-wide">
              Proceed to Onboarding Wizard →
            </Link>
          </div>
        ) : (
          <form onSubmit={handleVerify}>
            <div style={{ marginBottom: '24px' }}>
              <span className="cs-label" style={{ display: 'block', textAlign: 'center', marginBottom: '8px' }}>
                6-Digit Verification Code
              </span>
              <OtpInput value={code} onChange={setCode} disabled={busy} />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="button-wide"
              loading={busy}
              disabled={code.length < 6}
            >
              Verify & Activate Account
            </Button>
          </form>
        )}
      </div>
    </AuthShell>
  );
}
