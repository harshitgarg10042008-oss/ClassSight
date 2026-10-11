'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('teacher');
  const [password, setPassword] = useState('teacher123');
  const [loginErr, setLoginErr] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoginBusy(true);
    setLoginErr('');
    try {
      const d = await api.login(username, password);
      api.setToken(d.token);
      localStorage.setItem('token', d.token);
      localStorage.setItem('userFullName', d.fullName || d.username);
      localStorage.setItem('userRole', d.role);

      // Route based on role
      if (d.role === 'ADMIN') router.push('/admin');
      else if (d.role === 'HOD') router.push('/hod');
      else if (d.role === 'STUDENT') router.push('/student');
      else router.push('/teacher');
    } catch (err) {
      setLoginErr(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoginBusy(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">C</div>
          <div>
            <div className="login-logo-text">ClassSight</div>
            <div style={{ fontSize: 11, color: '#4a6b5c', fontFamily: "'DM Mono',monospace", marginTop: 2 }}>
              INTELLIGENT ATTENDANCE
            </div>
          </div>
        </div>
        <h1>Welcome back</h1>
        <p>Sign in to your institutional portal</p>
        <form className="login-form" onSubmit={handleLogin}>
          {loginErr && <div className="login-error">{loginErr}</div>}
          <label>
            Username or Email
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          <button className="login-btn" disabled={loginBusy}>
            {loginBusy ? (
              <>
                <span className="spinner" />
                Signing in…
              </>
            ) : (
              'Sign In →'
            )}
          </button>
        </form>
        <div className="login-hint">
          Demo: <code>teacher/teacher123</code> · <code>admin/admin123</code>
        </div>
      </div>
    </div>
  );
}
