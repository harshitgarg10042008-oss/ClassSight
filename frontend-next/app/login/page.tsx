'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { ApiClient } from '@/lib/api';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [remember, setRemember] = useState(false);
  useEffect(() => { try { setUsername(localStorage.getItem('classsight_username') || ''); } catch { /* optional browser storage */ } }, []);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      if (remember) { try { localStorage.setItem('classsight_username', username); } catch { /* optional browser storage */ } }
      const auth = await new ApiClient().login(username, password);
      new ApiClient().setToken(auth.token);
      window.location.assign('/app');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Login failed. Check your details and try again.');
    } finally { setBusy(false); }
  }
  return <main className="auth-page"><section className="auth-brand"><Link href="/" className="marketing-brand"><span className="brand-mark">C</span> ClassSight</Link><p>Reviewable attendance for classrooms where people stay accountable.</p></section><section className="auth-card" aria-labelledby="login-title"><span className="eyebrow">Welcome back</span><h1 id="login-title">Sign in to your workspace</h1>{process.env.NODE_ENV === 'development' && <p className="dev-hint">Local development hint: teacher / teacher123</p>}<form onSubmit={submit}>{error && <div className="form-error" role="alert">{error}</div>}<label className="field"><span>Username or email</span><input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required /></label><PasswordInput id="login-password" value={password} onChange={setPassword} /><label className="remember-row"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /> Remember username only</label><button className="button button-primary button-wide" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button></form><div className="auth-links"><Link href="/forgot-password">Forgot password?</Link><Link href="/signup">Create an account</Link></div></section></main>;
}
