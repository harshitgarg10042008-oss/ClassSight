'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { routes } from '@/config/routes';
import { notificationStoreKey, seedNotices } from '@/lib/notifications';

type Panel = 'bell' | 'palette' | 'help' | 'checklist' | 'switch' | null;

const shortcuts: [keys: string, action: string][] = [
  ['Ctrl + K', 'Open the command palette'],
  ['?', 'Open this shortcut panel'],
  ['Esc', 'Close the open panel'],
  ['Tab', 'Move focus to the next control'],
];

const checklistItems = [
  { id: 'c1', label: 'Read the privacy and consent boundaries' },
  { id: 'c2', label: 'Confirm the demo banner is visible on every workspace page' },
  { id: 'c3', label: 'Open the faculty workspace and try the capture steps' },
  { id: 'c4', label: 'Check the notification bell and mark one item read' },
];

function readList(key: string): string[] {
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function writeList(key: string, value: string[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* browser storage is optional */
  }
}

export function WorkspaceChrome() {
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>(null);
  const [read, setRead] = useState<string[]>([]);
  const [lang, setLang] = useState('en');
  const [plan, setPlan] = useState('essential');
  const [role, setRole] = useState('faculty');
  const [done, setDone] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRead(readList(notificationStoreKey));
    setDone(readList('classsight_checklist'));
    try {
      setLang(window.localStorage.getItem('classsight_lang') || 'en');
      setPlan(window.localStorage.getItem('classsight_demo_plan') || 'essential');
      setRole(window.localStorage.getItem('classsight_demo_role') || 'faculty');
    } catch {
      /* browser storage is optional */
    }
  }, []);

  const unread = seedNotices.filter((notice) => !read.includes(notice.id));

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      if (event.key === 'Escape') {
        setPanel(null);
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPanel((current) => (current === 'palette' ? null : 'palette'));
        return;
      }
      if (event.key === '?' && !typing) {
        event.preventDefault();
        setPanel((current) => (current === 'help' ? null : 'help'));
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (panel === 'palette') searchRef.current?.focus();
  }, [panel]);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = routes.filter((route) => !needle || route.path.toLowerCase().includes(needle) || route.purpose.toLowerCase().includes(needle));
    return list.slice(0, 8);
  }, [query]);

  function markRead(id: string) {
    const next = read.includes(id) ? read : [...read, id];
    setRead(next);
    writeList(notificationStoreKey, next);
  }

  function markAll() {
    const next = seedNotices.map((notice) => notice.id);
    setRead(next);
    writeList(notificationStoreKey, next);
  }

  function toggleChecklist(id: string) {
    const next = done.includes(id) ? done.filter((item) => item !== id) : [...done, id];
    setDone(next);
    writeList('classsight_checklist', next);
  }

  const toggle = (next: Panel) => setPanel((current) => (current === next ? null : next));

  return (
    <div className="workspace-chrome" role="group" aria-label="Workspace tools">
      <button type="button" className="chrome-button" aria-expanded={panel === 'bell'} onClick={() => toggle('bell')}>
        Notifications
        <span className="chrome-count" aria-hidden="true">{unread.length}</span>
        <span className="sr-only">{unread.length} unread</span>
      </button>
      <select className="chrome-select" aria-label="Language (Hindi translation is partial)" value={lang}
        onChange={(event) => {
          setLang(event.target.value);
          try { window.localStorage.setItem('classsight_lang', event.target.value); } catch { /* optional */ }
        }}>
        <option value="en">English</option>
        <option value="hi">हिन्दी (partial)</option>
      </select>
      <button type="button" className="chrome-button" aria-expanded={panel === 'palette'} onClick={() => toggle('palette')}>Search (Ctrl+K)</button>
      <button type="button" className="chrome-button" aria-expanded={panel === 'help'} onClick={() => toggle('help')}>Shortcuts (?)</button>
      <button type="button" className="chrome-button" aria-expanded={panel === 'checklist'} onClick={() => toggle('checklist')}>
        Onboarding {done.length}/{checklistItems.length}
      </button>
      <button type="button" className="chrome-button" aria-expanded={panel === 'switch'} onClick={() => toggle('switch')}>Demo plan and role</button>

      {lang === 'hi' && (
        <p className="hint" role="status" style={{ width: '100%', margin: 0 }}>
          Hindi translation is partial: navigation labels stay in English in this preview.
        </p>
      )}

      {panel === 'bell' && (
        <div className="chrome-panel">
          <h2>Notifications ({unread.length} unread)</h2>
          <ul>
            {seedNotices.map((notice) => (
              <li key={notice.id}>
                <span>
                  <strong>{notice.title}</strong>
                  <br />
                  <span className="muted">{notice.about} · {notice.received}</span>
                </span>
                {read.includes(notice.id)
                  ? <span className="badge badge-gray">Read</span>
                  : <button type="button" className="chrome-button" onClick={() => markRead(notice.id)}>Mark read</button>}
              </li>
            ))}
          </ul>
          <div className="chrome-actions">
            <button type="button" className="chrome-button" onClick={markAll} disabled={unread.length === 0}>Mark all read</button>
            <Link className="chrome-button" href="/notifications">Open notification centre</Link>
          </div>
          <p className="hint" style={{ marginBottom: 0 }}>Sample notifications. Nothing was sent.</p>
        </div>
      )}

      {panel === 'palette' && (
        <div className="chrome-panel">
          <h2>Jump to a page</h2>
          <input
            ref={searchRef}
            aria-label="Search pages"
            placeholder="Type a route or a purpose"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && matches[0]) {
                setPanel(null);
                router.push(matches[0].path);
              }
            }}
            style={{ width: '100%', padding: '9px 10px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--card-2)', color: 'var(--ink)' }}
          />
          <div style={{ marginTop: 10 }}>
            {matches.length === 0 && <p className="hint">No route matches that text.</p>}
            {matches.map((route) => (
              <Link key={route.path} className="chrome-link" href={route.path} onClick={() => setPanel(null)}>
                <code>{route.path}</code> · {route.purpose}
              </Link>
            ))}
          </div>
        </div>
      )}

      {panel === 'help' && (
        <div className="chrome-panel">
          <h2>Keyboard shortcuts</h2>
          <ul>
            {shortcuts.map(([keys, action]) => (
              <li key={keys}><code>{keys}</code><span>{action}</span></li>
            ))}
          </ul>
          <p className="hint" style={{ marginBottom: 0 }}>Every shortcut works without a mouse. Escape always closes this panel.</p>
        </div>
      )}

      {panel === 'checklist' && (
        <div className="chrome-panel">
          <h2>Onboarding checklist</h2>
          <div className="chrome-checklist">
            {checklistItems.map((item) => (
              <label key={item.id}>
                <input type="checkbox" checked={done.includes(item.id)} onChange={() => toggleChecklist(item.id)} />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
          <p className="hint" style={{ marginBottom: 0 }}>{done.length} of {checklistItems.length} done. Progress is stored in this browser only.</p>
        </div>
      )}

      {panel === 'switch' && (
        <div className="chrome-panel">
          <h2>Demo plan and role</h2>
          <label className="field" style={{ margin: 0 }}>
            Plan
            <select value={plan} onChange={(event) => {
              setPlan(event.target.value);
              try { window.localStorage.setItem('classsight_demo_plan', event.target.value); } catch { /* optional */ }
            }}>
              <option value="essential">Essential</option>
              <option value="pro">Pro</option>
              <option value="advanced">Advanced</option>
            </select>
          </label>
          <label className="field">
            Role
            <select value={role} onChange={(event) => {
              setRole(event.target.value);
              try { window.localStorage.setItem('classsight_demo_role', event.target.value); } catch { /* optional */ }
            }}>
              <option value="faculty">Faculty</option>
              <option value="hod">HOD</option>
              <option value="admin">Institution admin</option>
              <option value="owner">Platform owner</option>
            </select>
          </label>
          <p className="hint" style={{ marginBottom: 0 }}>
            Demo mode, nothing was sent. The switch changes this browser only; no role or entitlement is granted on the server.
          </p>
        </div>
      )}
    </div>
  );
}
