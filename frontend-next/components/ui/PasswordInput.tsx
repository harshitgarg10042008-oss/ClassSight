'use client';

import React, { useState, useEffect } from 'react';

export interface PasswordInputProps {
  id: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  hint?: string;
  showStrength?: boolean;
  confirmValue?: string;
  onEnter?: () => void;
  className?: string;
}

export function PasswordInput({
  id,
  label = 'Password',
  value,
  onChange,
  autoComplete = 'current-password',
  required = true,
  placeholder = '••••••••',
  disabled = false,
  error,
  hint,
  showStrength = false,
  confirmValue,
  onEnter,
  className = '',
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState) {
      setCapsLock(e.getModifierState('CapsLock'));
    }
    if (e.key === 'Enter' && onEnter) {
      e.preventDefault();
      onEnter();
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState) {
      setCapsLock(e.getModifierState('CapsLock'));
    }
  };

  // Heuristic strength evaluation
  const hasMinLength = value.length >= 8;
  const hasUpper = /[A-Z]/.test(value);
  const hasLower = /[a-z]/.test(value);
  const hasNumber = /[0-9]/.test(value);
  const hasSpecial = /[^A-Za-z0-9]/.test(value);

  const score = [hasMinLength, hasUpper && hasLower, hasNumber, hasSpecial].filter(Boolean).length;
  const strengthLabel = value.length === 0 ? '' : score <= 1 ? 'Weak' : score <= 3 ? 'Fair' : 'Strong';
  const strengthColor = score <= 1 ? 'var(--tier-absent)' : score <= 3 ? 'var(--tier-review)' : 'var(--tier-auto)';

  const mismatch = confirmValue !== undefined && confirmValue.length > 0 && value !== confirmValue;

  return (
    <div className={`cs-form-field ${error ? 'has-error' : ''} ${className}`}>
      <div className="cs-label-row">
        {label && (
          <label htmlFor={id} className="cs-label">
            {label} {required && <span className="cs-required-mark" aria-hidden="true">*</span>}
          </label>
        )}
      </div>

      <div className="cs-password-wrapper">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          autoComplete={autoComplete}
          required={required}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={error || mismatch ? 'true' : undefined}
          aria-describedby={`${id}-hint ${id}-error ${id}-caps`}
          className="cs-input cs-password-input"
        />
        <button
          type="button"
          tabIndex={0}
          className="cs-password-toggle password-toggle"
          aria-pressed={visible}
          aria-label={visible ? 'Hide password' : 'Show password'}
          onClick={() => setVisible((prev) => !prev)}
        >
          {visible ? (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
          <span className="cs-sr-only">{visible ? 'Hide password' : 'Show password'}</span>
        </button>
      </div>

      {capsLock && (
        <div id={`${id}-caps`} className="cs-caps-warning" role="status" aria-live="polite">
          <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>Caps Lock is ON</span>
        </div>
      )}

      {showStrength && value.length > 0 && (
        <div className="cs-password-strength">
          <div className="cs-strength-bar-track">
            <div
              className="cs-strength-bar-fill"
              style={{
                width: `${(score / 4) * 100}%`,
                backgroundColor: strengthColor,
              }}
            />
          </div>
          <span className="cs-strength-label" style={{ color: strengthColor }}>
            Strength: {strengthLabel}
          </span>
          <ul className="cs-password-criteria">
            <li className={hasMinLength ? 'met' : 'unmet'}>8+ characters</li>
            <li className={hasUpper && hasLower ? 'met' : 'unmet'}>Upper & lower case</li>
            <li className={hasNumber ? 'met' : 'unmet'}>At least 1 number</li>
            <li className={hasSpecial ? 'met' : 'unmet'}>Special character</li>
          </ul>
        </div>
      )}

      {mismatch && (
        <p className="cs-error" role="alert">Passwords do not match</p>
      )}

      {hint && !error && <p id={`${id}-hint`} className="cs-hint">{hint}</p>}
      {error && <p id={`${id}-error`} className="cs-error" role="alert" aria-live="assertive">{error}</p>}
    </div>
  );
}
