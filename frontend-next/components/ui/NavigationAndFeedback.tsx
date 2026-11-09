'use client';

import React, { useState } from 'react';

// ─── Stepper ──────────────────────────────────────────────────────────────────
export interface StepItem {
  id: string | number;
  label: string;
  description?: string;
}

export function Stepper({
  steps,
  currentStep,
  onChange,
}: {
  steps: StepItem[];
  currentStep: number;
  onChange?: (step: number) => void;
}) {
  return (
    <nav className="cs-stepper" aria-label="Progress steps">
      <ol className="cs-stepper-list">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentStep;
          const isCurrent = idx === currentStep;
          return (
            <li
              key={step.id}
              className={`cs-step-item ${isCompleted ? 'is-completed' : ''} ${isCurrent ? 'is-current' : ''}`}
            >
              <button
                type="button"
                className="cs-step-button"
                disabled={!onChange || (!isCompleted && !isCurrent)}
                onClick={() => onChange?.(idx)}
                aria-current={isCurrent ? 'step' : undefined}
              >
                <span className="cs-step-indicator">
                  {isCompleted ? '✓' : idx + 1}
                </span>
                <span className="cs-step-text">
                  <span className="cs-step-label">{step.label}</span>
                  {step.description && <span className="cs-step-desc">{step.description}</span>}
                </span>
              </button>
              {idx < steps.length - 1 && <div className="cs-step-line" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ─── Avatar (Initials) ────────────────────────────────────────────────────────
export function Avatar({
  name,
  size = 'md',
  className = '',
}: {
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const initials = (name || '')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

  // Deterministic pastel color palette based on name hash
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const colors = [
    { bg: '#E0F2FE', text: '#0369A1' },
    { bg: '#DCFCE7', text: '#15803D' },
    { bg: '#FEF3C7', text: '#B45309' },
    { bg: '#FEE2E2', text: '#B91C1C' },
    { bg: '#EDE9FE', text: '#6D28D9' },
    { bg: '#FCE7F3', text: '#BE185D' },
    { bg: '#F1F5F9', text: '#334155' },
  ];
  const color = colors[Math.abs(hash) % colors.length];

  return (
    <div
      className={`cs-avatar cs-avatar-${size} ${className}`}
      style={{ backgroundColor: color.bg, color: color.text }}
      aria-label={`Avatar for ${name}`}
      title={name}
    >
      <span className="cs-avatar-initials">{initials}</span>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
export function Skeleton({
  variant = 'text',
  width,
  height,
  className = '',
}: {
  variant?: 'text' | 'card' | 'circle' | 'table';
  width?: string | number;
  height?: string | number;
  className?: string;
}) {
  return (
    <div
      className={`cs-skeleton cs-skeleton-${variant} ${className}`}
      style={{
        width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
        height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined,
      }}
      aria-hidden="true"
    />
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
export function EmptyState({
  title,
  description,
  icon,
  action,
  className = '',
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`cs-empty-state ${className}`}>
      {icon && <div className="cs-empty-icon" aria-hidden="true">{icon}</div>}
      <h3 className="cs-empty-title">{title}</h3>
      {description && <p className="cs-empty-description">{description}</p>}
      {action && <div className="cs-empty-action">{action}</div>}
    </div>
  );
}

// ─── Banner ───────────────────────────────────────────────────────────────────
export function Banner({
  type = 'info',
  message,
  action,
  dismissible = false,
  onDismiss,
}: {
  type?: 'sample' | 'info' | 'warning' | 'error' | 'success';
  message: React.ReactNode;
  action?: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
}) {
  return (
    <div className={`cs-banner cs-banner-${type}`} role="status">
      <div className="cs-banner-content">
        {type === 'sample' && <span className="cs-banner-tag">SAMPLE DATA</span>}
        <span className="cs-banner-message">{message}</span>
      </div>
      {action && <div className="cs-banner-action">{action}</div>}
      {dismissible && onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="cs-banner-dismiss"
          aria-label="Dismiss banner"
        >
          ✕
        </button>
      )}
    </div>
  );
}

// ─── Breadcrumbs ──────────────────────────────────────────────────────────────
export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav className="cs-breadcrumbs" aria-label="Breadcrumb">
      <ol className="cs-breadcrumbs-list">
        {crumbs.map((crumb, idx) => {
          const isLast = idx === crumbs.length - 1;
          return (
            <li key={idx} className="cs-crumb-item">
              {isLast || !crumb.href ? (
                <span className="cs-crumb-current" aria-current="page">
                  {crumb.label}
                </span>
              ) : (
                <a href={crumb.href} className="cs-crumb-link">
                  {crumb.label}
                </a>
              )}
              {!isLast && <span className="cs-crumb-separator" aria-hidden="true">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ─── Progress & ProgressRing ──────────────────────────────────────────────────
export function Progress({
  value,
  max = 100,
  label,
  className = '',
}: {
  value: number;
  max?: number;
  label?: string;
  className?: string;
}) {
  const percent = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  return (
    <div className={`cs-progress-wrapper ${className}`}>
      {label && (
        <div className="cs-progress-label-row">
          <span className="cs-progress-label">{label}</span>
          <span className="cs-progress-val tabular-nums">{percent}%</span>
        </div>
      )}
      <div className="cs-progress-track" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div className="cs-progress-bar" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function ProgressRing({
  value,
  size = 64,
  strokeWidth = 6,
  label,
  color = 'var(--lagoon-600)',
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percent = Math.min(100, Math.max(0, value));
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="cs-progress-ring-container" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--line)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="cs-progress-ring-text">
        <span className="cs-progress-ring-num tabular-nums">{percent}%</span>
        {label && <span className="cs-progress-ring-sub">{label}</span>}
      </div>
    </div>
  );
}

// ─── Accordion ────────────────────────────────────────────────────────────────
export interface AccordionItem {
  id: string;
  title: string;
  content: React.ReactNode;
}

export function Accordion({
  items,
  allowMultiple = false,
}: {
  items: AccordionItem[];
  allowMultiple?: boolean;
}) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set([items[0]?.id || '']));

  const toggle = (id: string) => {
    const next = new Set(openIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      if (!allowMultiple) next.clear();
      next.add(id);
    }
    setOpenIds(next);
  };

  return (
    <div className="cs-accordion">
      {items.map((item) => {
        const isOpen = openIds.has(item.id);
        return (
          <div key={item.id} className={`cs-accordion-item ${isOpen ? 'is-open' : ''}`}>
            <button
              type="button"
              className="cs-accordion-trigger"
              onClick={() => toggle(item.id)}
              aria-expanded={isOpen}
              aria-controls={`accordion-body-${item.id}`}
            >
              <span className="cs-accordion-title">{item.title}</span>
              <span className={`cs-accordion-chevron ${isOpen ? 'is-open' : ''}`} aria-hidden="true">
                ▾
              </span>
            </button>
            {isOpen && (
              <div id={`accordion-body-${item.id}`} className="cs-accordion-body" role="region">
                <div className="cs-accordion-content">{item.content}</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
