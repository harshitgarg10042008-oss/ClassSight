'use client';

import React, { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { AuthShell } from '@/components/shell/AuthShell';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Button } from '@/components/ui/Button';
import { Input, Checkbox } from '@/components/ui/FormControls';
import { ApiClient } from '@/lib/api';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [remember, setRemember] = useState(false);

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('classsight_username');
      if (savedUser) {
        setUsername(savedUser);
        setRemember(true);
      }
    } catch {
      /* optional browser storage */
    }
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setBusy(true);

    try {
      if (remember) {
        try {
          localStorage.setItem('classsight_username', username);
        } catch {
          /* optional browser storage */
        }
      } else {
        try {
          localStorage.removeItem('classsight_username');
        } catch {}
      }

      const auth = await new ApiClient().login(username, password);
      new ApiClient().setToken(auth.token);
      try {
        localStorage.setItem('classsight_full_name', auth.fullName || auth.username);
        localStorage.setItem('classsight_role', auth.role);
      } catch {
        /* optional browser storage */
      }
      window.location.assign('/app');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Login failed. Check your details and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      badge="Secure Access"
      title="Sign in to your workspace"
      subtitle="Access real-time classroom capture and faculty review queue."
      footerLink={{
        text: "Don't have an institution account?",
        href: "/signup",
        actionText: "Create an account",
      }}
    >
      {process.env.NODE_ENV === 'development' && (
        <div className="cs-banner cs-banner-info" style={{ borderRadius: '6px', marginBottom: '16px' }}>
          <span>🛠️ Local development hint: <code>teacher</code> / <code>teacher123</code></span>
        </div>
      )}

      {error && (
        <div
          className="cs-banner cs-banner-error"
          role="alert"
          aria-live="assertive"
          style={{
            backgroundColor: 'var(--tier-absent-bg)',
            color: 'var(--tier-absent-text)',
            borderRadius: '6px',
            marginBottom: '16px',
            border: '1px solid var(--tier-absent-border)',
          }}
        >
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <Input
          id="login-username"
          label="Username or Email"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          required
          placeholder="teacher or faculty@college.edu"
          disabled={busy}
        />

        <PasswordInput
          id="login-password"
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          required
          placeholder="Enter password"
          disabled={busy}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <Checkbox
            id="remember-user"
            label="Remember username"
            hint="Saves username only in local storage"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          <Link
            href="/forgot-password"
            className="cs-auth-footer-link"
            style={{ fontSize: '12px' }}
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="md"
          loading={busy}
          className="button-wide"
        >
          {busy ? 'Verifying credentials…' : 'Sign In'}
        </Button>
      </form>

      <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
        <span>Single-capture attendance cannot be committed without the faculty review call.</span>
      </div>
    </AuthShell>
  );
}
