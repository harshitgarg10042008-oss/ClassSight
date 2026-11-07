'use client';

import { useState } from 'react';

export function PasswordInput({
  id,
  label = 'Password',
  value,
  onChange,
  autoComplete = 'current-password',
  required = true,
}: {
  id: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  required?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <span className="password-field">
        <input id={id} type={visible ? 'text' : 'password'} value={value}
          onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} required={required} />
        <button type="button" className="password-toggle" aria-pressed={visible}
          aria-label={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible((current) => !current)}>
          {visible ? 'Hide' : 'Show'}
        </button>
      </span>
    </label>
  );
}
