'use client';

import Link from 'next/link';
import { PasswordInput } from './ui/PasswordInput';

export function AuthPreview({ title, description, password = false }: { title: string; description: string; password?: boolean }) {
  return <main className="auth-page"><section className="auth-brand"><Link href="/" className="marketing-brand"><span className="brand-mark">C</span> ClassSight</Link><p>Account flows are ready for the next backend capability.</p></section><section className="auth-card"><span className="eyebrow">Preview flow</span><h1>{title}</h1><p>{description}</p><form onSubmit={(event) => event.preventDefault()}><label className="field"><span>Email</span><input type="email" autoComplete="email" required /></label>{password && <PasswordInput id="preview-password" label="New password" value="" onChange={() => {}} autoComplete="new-password" /> }<button className="button button-primary button-wide">Continue</button><p className="sample-banner">Demo mode, nothing was sent.</p></form><Link href="/login">Back to sign in</Link></section></main>;
}
