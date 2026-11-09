'use client';

import React, { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const isDark =
      document.documentElement.classList.contains('dark') ||
      document.documentElement.getAttribute('data-theme') === 'dark';
    setDark(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    try {
      localStorage.setItem('classsight-theme', next ? 'dark' : 'light');
    } catch {
      /* storage is optional */
    }
  }

  return (
    <button
      type="button"
      className="cs-theme-toggle-btn"
      onClick={toggle}
      aria-label={`Switch to ${dark ? 'light' : 'dark'} mode`}
      title={`Switch to ${dark ? 'Light' : 'Dark'} Mode`}
    >
      <div className="cs-theme-icon-track">
        {/* Sun Icon (shown when light mode, clicking turns to dark) */}
        <span className={`cs-theme-icon cs-sun-icon ${!dark ? 'is-active' : ''}`} aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4.5" fill="currentColor" fillOpacity="0.2" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="M4.93 4.93l1.41 1.41" />
            <path d="M17.66 17.66l1.41 1.41" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="M6.34 17.66l-1.41 1.41" />
            <path d="M19.07 4.93l-1.41 1.41" />
          </svg>
        </span>

        {/* Moon Icon (shown when dark mode, clicking turns to light) */}
        <span className={`cs-theme-icon cs-moon-icon ${dark ? 'is-active' : ''}`} aria-hidden="true">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor" fillOpacity="0.25" />
            <circle cx="19" cy="5" r="1" fill="currentColor" stroke="none" />
            <circle cx="16" cy="9" r="0.75" fill="currentColor" stroke="none" />
          </svg>
        </span>
      </div>
      <span className="cs-theme-label sr-only">{dark ? 'Dark Mode' : 'Light Mode'}</span>
    </button>
  );
}
