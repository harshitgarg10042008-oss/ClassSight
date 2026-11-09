'use client';

import React, { useId } from 'react';

// ─── Input ────────────────────────────────────────────────────────────────────
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  label,
  hint,
  error,
  leftAddon,
  rightAddon,
  id: customId,
  className = '',
  required,
  ...props
}, ref) => {
  const generatedId = useId();
  const id = customId || generatedId;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <div className={`cs-form-field ${error ? 'has-error' : ''}`}>
      {label && (
        <label htmlFor={id} className="cs-label">
          {label} {required && <span className="cs-required-mark" aria-hidden="true">*</span>}
        </label>
      )}
      <div className="cs-input-wrapper">
        {leftAddon && <span className="cs-addon cs-addon-left">{leftAddon}</span>}
        <input
          ref={ref}
          id={id}
          required={required}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={`cs-input ${className}`}
          {...props}
        />
        {rightAddon && <span className="cs-addon cs-addon-right">{rightAddon}</span>}
      </div>
      {hint && !error && <p id={hintId} className="cs-hint">{hint}</p>}
      {error && <p id={errorId} className="cs-error" role="alert">{error}</p>}
    </div>
  );
});
Input.displayName = 'Input';

// ─── Textarea ─────────────────────────────────────────────────────────────────
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({
  label,
  hint,
  error,
  id: customId,
  className = '',
  required,
  rows = 4,
  ...props
}, ref) => {
  const generatedId = useId();
  const id = customId || generatedId;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <div className={`cs-form-field ${error ? 'has-error' : ''}`}>
      {label && (
        <label htmlFor={id} className="cs-label">
          {label} {required && <span className="cs-required-mark" aria-hidden="true">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        required={required}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={`cs-input cs-textarea ${className}`}
        {...props}
      />
      {hint && !error && <p id={hintId} className="cs-hint">{hint}</p>}
      {error && <p id={errorId} className="cs-error" role="alert">{error}</p>}
    </div>
  );
});
Textarea.displayName = 'Textarea';

// ─── Select ───────────────────────────────────────────────────────────────────
export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  options?: SelectOption[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  hint,
  error,
  options,
  id: customId,
  className = '',
  children,
  required,
  ...props
}, ref) => {
  const generatedId = useId();
  const id = customId || generatedId;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <div className={`cs-form-field ${error ? 'has-error' : ''}`}>
      {label && (
        <label htmlFor={id} className="cs-label">
          {label} {required && <span className="cs-required-mark" aria-hidden="true">*</span>}
        </label>
      )}
      <div className="cs-select-wrapper">
        <select
          ref={ref}
          id={id}
          required={required}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={`cs-input cs-select ${className}`}
          {...props}
        >
          {options ? options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          )) : children}
        </select>
        <span className="cs-select-chevron" aria-hidden="true">▾</span>
      </div>
      {hint && !error && <p id={hintId} className="cs-hint">{hint}</p>}
      {error && <p id={errorId} className="cs-error" role="alert">{error}</p>}
    </div>
  );
});
Select.displayName = 'Select';

// ─── Checkbox ─────────────────────────────────────────────────────────────────
export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  hint?: string;
  error?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(({
  label,
  hint,
  error,
  id: customId,
  className = '',
  ...props
}, ref) => {
  const generatedId = useId();
  const id = customId || generatedId;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <div className={`cs-checkbox-field ${error ? 'has-error' : ''}`}>
      <label htmlFor={id} className="cs-checkbox-label">
        <input
          ref={ref}
          id={id}
          type="checkbox"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={`cs-checkbox ${className}`}
          {...props}
        />
        <span className="cs-checkbox-custom" aria-hidden="true" />
        {label && <span className="cs-checkbox-text">{label}</span>}
      </label>
      {hint && !error && <p id={hintId} className="cs-hint">{hint}</p>}
      {error && <p id={errorId} className="cs-error" role="alert">{error}</p>}
    </div>
  );
});
Checkbox.displayName = 'Checkbox';

// ─── Switch ───────────────────────────────────────────────────────────────────
export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(({
  label,
  description,
  id: customId,
  checked,
  className = '',
  ...props
}, ref) => {
  const generatedId = useId();
  const id = customId || generatedId;

  return (
    <label htmlFor={id} className={`cs-switch-wrapper ${className}`}>
      <div className="cs-switch-track">
        <input
          ref={ref}
          id={id}
          type="checkbox"
          role="switch"
          aria-checked={checked}
          checked={checked}
          className="cs-switch-input"
          {...props}
        />
        <span className="cs-switch-thumb" aria-hidden="true" />
      </div>
      {(label || description) && (
        <span className="cs-switch-label-group">
          {label && <span className="cs-switch-title">{label}</span>}
          {description && <span className="cs-switch-description">{description}</span>}
        </span>
      )}
    </label>
  );
});
Switch.displayName = 'Switch';

// ─── Radio ────────────────────────────────────────────────────────────────────
export interface RadioOption {
  value: string;
  label: string;
  description?: string;
}

export interface RadioGroupProps {
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: RadioOption[];
  label?: string;
  error?: string;
}

export function RadioGroup({ name, value, onChange, options, label, error }: RadioGroupProps) {
  return (
    <fieldset className="cs-radio-group">
      {label && <legend className="cs-label">{label}</legend>}
      <div className="cs-radio-list">
        {options.map((opt) => (
          <label key={opt.value} className="cs-radio-label">
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="cs-radio"
            />
            <span className="cs-radio-custom" aria-hidden="true" />
            <span className="cs-radio-content">
              <span className="cs-radio-title">{opt.label}</span>
              {opt.description && <span className="cs-radio-desc">{opt.description}</span>}
            </span>
          </label>
        ))}
      </div>
      {error && <p className="cs-error" role="alert">{error}</p>}
    </fieldset>
  );
}

