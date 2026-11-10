'use client';

import React from 'react';
import Link from 'next/link';
import { site } from '@/config/site';
import { ThemeToggle } from '../ui/ThemeToggle';
import { LanguageSwitch } from '../ui/ToolsAndBadges';
import { Logo } from '../brand/Logo';

export function AuthShell({
  children,
  badge = 'Secure Access',
  title,
  subtitle,
  footerLink,
}: {
  children: React.ReactNode;
  badge?: string;
  title: string;
  subtitle?: string;
  footerLink?: { text: string; href: string; actionText: string };
}) {
  return (
    <div className="cs-auth-shell">
      {/* Brand Panel (Left) */}
      <aside className="cs-auth-brand-panel">
        <div className="cs-auth-brand-header">
          <Link href="/" className="cs-brand-link" aria-label="ClassSight Home">
            <Logo variant="lockup" tone="onDark" size={32} decorative />
          </Link>
          <div className="cs-auth-theme-tools">
            <LanguageSwitch />
            <ThemeToggle />
          </div>
        </div>

        <div className="cs-auth-brand-content">
          <span className="cs-auth-tag">Faculty-First Attendance</span>
          <h2 className="cs-auth-headline">
            Keep teachers in control of classroom attendance.
          </h2>
          <p className="cs-auth-subtext">
            ClassSight pairs computer vision with a strict faculty review step.
            Recognition suggests, but the teacher confirms every AUTO, REVIEW, and UNKNOWN detection.
          </p>

          <div className="cs-auth-quote-card">
            <div className="cs-quote-chips">
              <span className="cs-tier-chip cs-tier-tier-auto cs-tier-sm"><span className="cs-tier-icon">✓</span> AUTO</span>
              <span className="cs-tier-chip cs-tier-tier-review cs-tier-sm"><span className="cs-tier-icon">?</span> REVIEW</span>
              <span className="cs-tier-chip cs-tier-tier-unknown cs-tier-sm"><span className="cs-tier-icon">•</span> UNKNOWN</span>
            </div>
            <p className="cs-quote-text">
              "Single-capture attendance cannot be committed without the faculty review call."
            </p>
          </div>
        </div>

        <div className="cs-auth-brand-footer">
          <span>Face embeddings are not yet encrypted at rest.</span>
          <span>Designed to support consent workflows; legal text needs lawyer review.</span>
        </div>
      </aside>

      {/* Form Panel (Right) */}
      <main id="main-content" className="cs-auth-form-panel">
        <div className="cs-auth-card-container">
          <div className="cs-auth-card-header">
            <span className="cs-eyebrow">{badge}</span>
            <h1 className="cs-auth-card-title">{title}</h1>
            {subtitle && <p className="cs-auth-card-subtitle">{subtitle}</p>}
          </div>

          <div className="cs-auth-card-body">
            {children}
          </div>

          {footerLink && (
            <div className="cs-auth-card-footer">
              <span>{footerLink.text} </span>
              <Link href={footerLink.href} className="cs-auth-footer-link">
                {footerLink.actionText}
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

