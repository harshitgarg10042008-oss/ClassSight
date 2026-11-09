'use client';

import React from 'react';

export type TierStatus = 'AUTO' | 'REVIEW' | 'UNKNOWN' | 'ABSENT' | 'MANUAL';

export interface TierChipProps {
  status: TierStatus | string;
  count?: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function TierChip({
  status,
  count,
  label,
  size = 'md',
  interactive = false,
  selected = false,
  onClick,
  className = '',
}: TierChipProps) {
  const normStatus = (status || '').toUpperCase() as TierStatus;

  const chipClass = {
    AUTO: 'tier-auto',
    REVIEW: 'tier-review',
    UNKNOWN: 'tier-unknown',
    ABSENT: 'tier-absent',
    MANUAL: 'tier-review',
  }[normStatus] || 'tier-unknown';

  const defaultIcon = {
    AUTO: '✓',
    REVIEW: '?',
    UNKNOWN: '•',
    ABSENT: '✕',
    MANUAL: '✎',
  }[normStatus] || '•';

  const displayLabel = label || normStatus;

  return (
    <span
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? onClick : undefined}
      onKeyDown={interactive && onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
      className={`cs-tier-chip cs-tier-${chipClass} cs-tier-${size} ${interactive ? 'is-interactive' : ''} ${selected ? 'is-selected' : ''} ${className}`}
    >
      <span className="cs-tier-icon" aria-hidden="true">{defaultIcon}</span>
      <span className="cs-tier-label">{displayLabel}</span>
      {count !== undefined && <span className="cs-tier-count">({count})</span>}
    </span>
  );
}

// ─── Standard Badges ─────────────────────────────────────────────────────────
export interface BadgeProps {
  variant?: 'neutral' | 'success' | 'warning' | 'danger' | 'brand' | 'purple';
  children: React.ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({
  variant = 'neutral',
  children,
  size = 'md',
  className = '',
}: BadgeProps) {
  return (
    <span className={`cs-badge cs-badge-${variant} cs-badge-${size} ${className}`}>
      {children}
    </span>
  );
}

// ─── Tooltip & Popover ───────────────────────────────────────────────────────
export function Tooltip({
  text,
  children,
}: {
  text: string;
  children: React.ReactNode;
}) {
  return (
    <span className="cs-tooltip-wrapper">
      {children}
      <span role="tooltip" className="cs-tooltip-bubble">
        {text}
      </span>
    </span>
  );
}
