'use client';

import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains('dark')), []);
  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('classsight-theme', next ? 'dark' : 'light'); } catch { /* storage is optional */ }
  }
  return <button type="button" className="theme-toggle" onClick={toggle} aria-label={`Use ${dark ? 'light' : 'dark'} theme`}>{dark ? '☼' : '◐'}</button>;
}
