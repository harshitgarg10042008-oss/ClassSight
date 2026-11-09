'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

// ─── StatusTag & PlanBadge ────────────────────────────────────────────────────
export function StatusTag({ status }: { status: 'WIRED' | 'UI-PREVIEW' | 'COMING-SOON' | string }) {
  const norm = (status || '').toUpperCase();
  const badgeStyle = {
    WIRED: { bg: '#DCFCE7', text: '#14532D', label: 'Wired' },
    'UI-PREVIEW': { bg: '#FEF3C7', text: '#78350F', label: 'Preview' },
    'COMING-SOON': { bg: '#F1F5F9', text: '#334155', label: 'Coming Soon' },
  }[norm] || { bg: '#F1F5F9', text: '#334155', label: norm };

  return (
    <span
      className="cs-status-tag"
      style={{ backgroundColor: badgeStyle.bg, color: badgeStyle.text }}
    >
      {badgeStyle.label}
    </span>
  );
}

export function PlanBadge({ plan }: { plan: 'essential' | 'pro' | 'advanced' | string }) {
  const norm = (plan || '').toLowerCase();
  const label = norm === 'essential' ? 'Essential' : norm === 'pro' ? 'Pro' : 'Advanced';
  const colorClass = `cs-plan-badge-${norm}`;

  return (
    <span className={`cs-plan-badge ${colorClass}`}>
      {label}
    </span>
  );
}

// ─── LockedFeature ────────────────────────────────────────────────────────────
export function LockedFeature({
  plan = 'pro',
  featureName,
  description,
}: {
  plan?: 'essential' | 'pro' | 'advanced' | string;
  featureName?: string;
  description?: string;
}) {
  const planDisplay = plan.charAt(0).toUpperCase() + plan.slice(1);

  return (
    <div className="cs-locked-card" role="region" aria-label="Feature upgrade prompt">
      <div className="cs-locked-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
      <div className="cs-locked-body">
        <div className="cs-locked-badge-row">
          <span className="cs-plan-badge cs-plan-badge-pro">{planDisplay} Plan</span>
        </div>
        <h3 className="cs-locked-title">{featureName || 'Upgrade required'}</h3>
        <p className="cs-locked-description">
          {description || `This signature capability is available on the ${planDisplay} plan and above.`}
        </p>
        <div className="cs-locked-actions">
          <Link href="/pricing" className="cs-button button-primary button-sm">
            View plans & upgrade
          </Link>
          <Link href="/book-demo" className="cs-button button-outline button-sm">
            Schedule a demo
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── LanguageSwitch (English / Hindi Scaffolding) ──────────────────────────────
export function LanguageSwitch() {
  const [lang, setLang] = useState<'en' | 'hi'>('en');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('classsight-lang') as 'en' | 'hi';
      if (stored === 'en' || stored === 'hi') setLang(stored);
    } catch {}
  }, []);

  const switchLang = (next: 'en' | 'hi') => {
    setLang(next);
    try {
      localStorage.setItem('classsight-lang', next);
    } catch {}
  };

  return (
    <div className="cs-lang-switch">
      <button
        type="button"
        className={`cs-lang-btn ${lang === 'en' ? 'is-active' : ''}`}
        onClick={() => switchLang('en')}
        aria-label="Switch to English"
      >
        EN
      </button>
      <span className="cs-lang-divider" aria-hidden="true">|</span>
      <button
        type="button"
        className={`cs-lang-btn ${lang === 'hi' ? 'is-active' : ''}`}
        onClick={() => switchLang('hi')}
        aria-label="Switch to Hindi (हिन्दी)"
        title="हिन्दी (Partial localization scaffolding)"
      >
        हिन्दी
        <span className="cs-lang-partial" title="Scaffolded (partial)">*</span>
      </button>
    </div>
  );
}

// ─── FileDrop ─────────────────────────────────────────────────────────────────
export function FileDrop({
  label = 'Upload file',
  hint = 'Drag & drop image or click to browse (PNG, JPG, max 10MB)',
  accept = 'image/*',
  onFilesSelected,
}: {
  label?: string;
  hint?: string;
  accept?: string;
  onFilesSelected: (files: File[]) => void;
}) {
  const [isOver, setIsOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(Array.from(e.dataTransfer.files));
    }
  };

  return (
    <div
      className={`cs-filedrop ${isOver ? 'is-dragover' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
      onDragLeave={() => setIsOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="cs-filedrop-input"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onFilesSelected(Array.from(e.target.files));
          }
        }}
      />
      <div className="cs-filedrop-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <strong className="cs-filedrop-label">{label}</strong>
      <p className="cs-filedrop-hint">{hint}</p>
    </div>
  );
}

// ─── CommandPalette (Ctrl+K) ──────────────────────────────────────────────────
export interface CommandItem {
  id: string;
  category: 'Pages' | 'Actions' | 'Switch Role';
  title: string;
  shortcut?: string;
  href?: string;
  onSelect?: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  items,
}: {
  isOpen: boolean;
  onClose: () => void;
  items: CommandItem[];
}) {
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);

  const filtered = items.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // Toggle
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
      if (isOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setActiveIdx((prev) => (prev + 1) % Math.max(1, filtered.length));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setActiveIdx((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
        } else if (e.key === 'Enter' && filtered[activeIdx]) {
          e.preventDefault();
          const item = filtered[activeIdx];
          if (item.onSelect) item.onSelect();
          else if (item.href) window.location.href = item.href;
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, filtered, activeIdx]);

  if (!isOpen) return null;

  return (
    <div className="cs-palette-backdrop" onClick={onClose} role="presentation">
      <div
        className="cs-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cs-palette-search">
          <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search routes..."
            className="cs-palette-input"
          />
          <kbd className="cs-palette-kbd">ESC</kbd>
        </div>

        <div className="cs-palette-list" role="listbox">
          {filtered.length === 0 ? (
            <div className="cs-palette-empty">No results found for "{query}"</div>
          ) : (
            filtered.map((item, idx) => {
              const isActive = idx === activeIdx;
              return (
                <div
                  key={item.id}
                  role="option"
                  aria-selected={isActive}
                  className={`cs-palette-item ${isActive ? 'is-active' : ''}`}
                  onClick={() => {
                    if (item.onSelect) item.onSelect();
                    else if (item.href) window.location.href = item.href;
                    onClose();
                  }}
                  onMouseEnter={() => setActiveIdx(idx)}
                >
                  <span className="cs-palette-item-tag">{item.category}</span>
                  <span className="cs-palette-item-title">{item.title}</span>
                  {item.shortcut && <kbd className="cs-palette-item-kbd">{item.shortcut}</kbd>}
                </div>
              );
            })
          )}
        </div>

        <div className="cs-palette-footer">
          <span>Navigate with <kbd>↑</kbd> <kbd>↓</kbd></span>
          <span>Select with <kbd>↵</kbd></span>
          <span>Close with <kbd>esc</kbd></span>
        </div>
      </div>
    </div>
  );
}

