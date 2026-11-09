'use client';

import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  children,
  className = '',
  disabled,
  ...props
}, ref) => {
  const variantClass = {
    primary: 'button-primary',
    secondary: 'button-secondary',
    outline: 'button-outline',
    ghost: 'button-ghost',
    danger: 'button-danger',
  }[variant];

  const sizeClass = {
    sm: 'button-sm',
    md: 'button-md',
    lg: 'button-lg',
  }[size];

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`cs-button ${variantClass} ${sizeClass} ${loading ? 'is-loading' : ''} ${className}`}
      {...props}
    >
      {loading && (
        <svg className="cs-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
          <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
        </svg>
      )}
      {!loading && leftIcon && <span className="cs-button-icon-left">{leftIcon}</span>}
      <span>{children}</span>
      {!loading && rightIcon && <span className="cs-button-icon-right">{rightIcon}</span>}
    </button>
  );
});

Button.displayName = 'Button';

