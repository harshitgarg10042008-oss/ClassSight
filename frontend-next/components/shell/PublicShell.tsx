'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { site } from '@/config/site';
import { ThemeToggle } from '../ui/ThemeToggle';
import { LanguageSwitch } from '../ui/ToolsAndBadges';

export function PublicShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);

  return (
    <div className="cs-public-shell">
      {/* Sticky Header */}
      <header className="cs-public-header">
        <div className="cs-public-nav-container">
          <Link href="/" className="cs-brand-link">
            <span className="cs-brand-mark">C</span>
            <span className="cs-brand-name">{site.name}</span>
          </Link>

          <nav className="cs-desktop-nav" aria-label="Main Navigation">
            <Link href="/features" className="cs-nav-link">Features</Link>
            <div
              className="cs-nav-dropdown-wrapper"
              onMouseEnter={() => setSolutionsOpen(true)}
              onMouseLeave={() => setSolutionsOpen(false)}
            >
              <button
                type="button"
                className="cs-nav-link cs-dropdown-trigger"
                onClick={() => setSolutionsOpen((prev) => !prev)}
                aria-expanded={solutionsOpen}
              >
                <span>Solutions</span>
                <span className="cs-chevron" aria-hidden="true">▾</span>
              </button>
              {solutionsOpen && (
                <div className="cs-mega-menu">
                  <div className="cs-mega-grid">
                    <Link href="/solutions/colleges" className="cs-mega-item" onClick={() => setSolutionsOpen(false)}>
                      <strong>Colleges & Universities</strong>
                      <span>Large lecture halls, multiple sections, and semester audit trails.</span>
                    </Link>
                    <Link href="/solutions/schools" className="cs-mega-item" onClick={() => setSolutionsOpen(false)}>
                      <strong>K-12 Schools</strong>
                      <span>Guardian consent workflows, homeroom tracking, minor data protections.</span>
                    </Link>
                    <Link href="/solutions/coaching" className="cs-mega-item" onClick={() => setSolutionsOpen(false)}>
                      <strong>Coaching & Test Prep</strong>
                      <span>Flexible batch schedules, drop-in attendance, student portals.</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
            <Link href="/how-it-works" className="cs-nav-link">How It Works</Link>
            <Link href="/pricing" className="cs-nav-link">Pricing</Link>
            <Link href="/security" className="cs-nav-link">Trust & Security</Link>
          </nav>

          <div className="cs-header-actions">
            <LanguageSwitch />
            <ThemeToggle />
            <Link href="/login" className="cs-button button-outline button-sm">
              Sign In
            </Link>
            <Link href="/app" className="cs-button button-primary button-sm">
              Try Workspace
            </Link>
            <button
              type="button"
              className="cs-mobile-menu-btn"
              onClick={() => setMobileMenuOpen((o) => !o)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="cs-mobile-drawer">
            <nav className="cs-mobile-nav" aria-label="Mobile Navigation">
              <Link href="/features" onClick={() => setMobileMenuOpen(false)}>Features</Link>
              <div className="cs-mobile-group">
                <span className="cs-mobile-group-title">Solutions</span>
                <Link href="/solutions/colleges" onClick={() => setMobileMenuOpen(false)}>Colleges</Link>
                <Link href="/solutions/schools" onClick={() => setMobileMenuOpen(false)}>Schools</Link>
                <Link href="/solutions/coaching" onClick={() => setMobileMenuOpen(false)}>Coaching</Link>
              </div>
              <Link href="/how-it-works" onClick={() => setMobileMenuOpen(false)}>How It Works</Link>
              <Link href="/pricing" onClick={() => setMobileMenuOpen(false)}>Pricing</Link>
              <Link href="/security" onClick={() => setMobileMenuOpen(false)}>Trust & Security</Link>
              <Link href="/contact" onClick={() => setMobileMenuOpen(false)}>Contact Sales</Link>
              <div className="cs-mobile-ctas">
                <Link href="/login" className="cs-button button-outline button-wide" onClick={() => setMobileMenuOpen(false)}>
                  Sign In
                </Link>
                <Link href="/app" className="cs-button button-primary button-wide" onClick={() => setMobileMenuOpen(false)}>
                  Open Workspace
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Page Content */}
      <div className="cs-public-body">
        {children}
      </div>

      {/* Rich Footer */}
      <footer className="cs-public-footer">
        <div className="cs-footer-grid">
          <div className="cs-footer-brand-col">
            <Link href="/" className="cs-brand-link">
              <span className="cs-brand-mark">C</span>
              <span className="cs-brand-name">{site.name}</span>
            </Link>
            <p className="cs-footer-tagline">{site.tagline}</p>
            <p className="cs-footer-disclaimer">
              Single-capture attendance cannot be committed without the faculty review call;
              multi-shot finalise can finalise a clean accumulator by explicit faculty action.
            </p>
            <span className="cs-footer-contact">Contact: {site.contactEmail}</span>
          </div>

          <div className="cs-footer-col">
            <h4>Product</h4>
            <ul>
              <li><Link href="/features">All Features</Link></li>
              <li><Link href="/how-it-works">How It Works</Link></li>
              <li><Link href="/pricing">Plans & Pricing</Link></li>
              <li><Link href="/integrations">Integrations</Link></li>
              <li><Link href="/changelog">Changelog</Link></li>
            </ul>
          </div>

          <div className="cs-footer-col">
            <h4>Solutions</h4>
            <ul>
              <li><Link href="/solutions/colleges">Colleges & Universities</Link></li>
              <li><Link href="/solutions/schools">K-12 Schools</Link></li>
              <li><Link href="/solutions/coaching">Coaching Institutes</Link></li>
              <li><Link href="/portal">Student & Parent Portal</Link></li>
              <li><Link href="/onboarding">Institution Onboarding</Link></li>
            </ul>
          </div>

          <div className="cs-footer-col">
            <h4>Trust & Privacy</h4>
            <ul>
              <li><Link href="/security">Security Center</Link></li>
              <li><Link href="/trust">Trust Center</Link></li>
              <li><Link href="/privacy">Privacy Notice (Draft)</Link></li>
              <li><Link href="/student-data-notice">Student Data Notice</Link></li>
              <li><Link href="/dpa">Data Processing Addendum</Link></li>
              <li><Link href="/accessibility">Accessibility</Link></li>
            </ul>
          </div>

          <div className="cs-footer-col">
            <h4>Company & Support</h4>
            <ul>
              <li><Link href="/about">About Us</Link></li>
              <li><Link href="/contact">Contact Support</Link></li>
              <li><Link href="/book-demo">Request a Demo</Link></li>
              <li><Link href="/faq">FAQ</Link></li>
              <li><Link href="/status">System Status</Link></li>
              <li><Link href="/sitemap">Site Directory</Link></li>
            </ul>
          </div>
        </div>

        <div className="cs-footer-bottom">
          <p>© {new Date().getFullYear()} ClassSight. Designed to support consent workflows; legal text needs lawyer review.</p>
          <div className="cs-footer-bottom-links">
            <Link href="/terms">Terms of Service</Link>
            <Link href="/cookies">Cookie Preferences</Link>
            <Link href="/acceptable-use">Acceptable Use</Link>
            <Link href="/refund">Refund Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
