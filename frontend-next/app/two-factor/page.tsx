'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AuthShell } from '@/components/shell/AuthShell';
import { Button } from '@/components/ui/Button';
import { OtpInput } from '@/components/ui/OtpInput';
import { Banner } from '@/components/ui/NavigationAndFeedback';
import { submitForm } from '@/lib/forms';

export default function TwoFactorPage() {
  const [code, setCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState('');

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await submitForm({
        action: '2fa_verify',
        code: useRecovery ? recoveryCode : code,
        isRecovery: String(useRecovery),
      });
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
      badge="Two-Factor Security"
      title="Second-factor authentication"
      subtitle="Enter the code from your institutional authenticator app."
      footerLink={{
        text: 'Having trouble?',
        href: '/contact',
        actionText: 'Contact IT Support',
      }}
    >
      <Banner
        type="sample"
        message="UI Preview — 2FA authentication is simulated. Submission ends in demo result."
      />

      <div style={{ marginTop: '20px' }}>
        {submitted ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🛡️</div>
            <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>Verification Successful</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              {message}
            </p>
            <Link href="/app" className="cs-button button-primary button-wide">
              Enter Workspace
            </Link>
          </div>
        ) : (
          <form onSubmit={handleVerify}>
            {!useRecovery ? (
              <div style={{ marginBottom: '20px' }}>
                <span className="cs-label" style={{ display: 'block', textAlign: 'center', marginBottom: '8px' }}>
                  6-Digit Authenticator Code
                </span>
                <OtpInput value={code} onChange={setCode} disabled={busy} />
                <button
                  type="button"
                  className="cs-button button-ghost button-sm"
                  style={{ display: 'block', margin: '12px auto 0' }}
                  onClick={() => setUseRecovery(true)}
                >
                  Use a backup recovery code instead
                </button>
              </div>
            ) : (
              <div style={{ marginBottom: '20px' }}>
                <label className="cs-label" htmlFor="recovery-code">
                  Emergency Recovery Code
                </label>
                <input
                  id="recovery-code"
                  type="text"
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value)}
                  placeholder="XXXX-XXXX-XXXX"
                  className="cs-input"
                  style={{ marginTop: '6px' }}
                />
                <button
                  type="button"
                  className="cs-button button-ghost button-sm"
                  style={{ display: 'block', margin: '12px auto 0' }}
                  onClick={() => setUseRecovery(false)}
                >
                  ← Back to authenticator app
                </button>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              className="button-wide"
              loading={busy}
              disabled={useRecovery ? !recoveryCode : code.length < 6}
            >
              Verify & Sign In
            </Button>
          </form>
        )}
      </div>
    </AuthShell>
  );
}
