'use client';

import { useEffect, useMemo, useState } from 'react';
import { broadcastNoticesChanged, notificationStoreKey, onNoticesChanged, seedNotices } from '@/lib/notifications';

function readList(): string[] {
  try {
    const raw = window.localStorage.getItem(notificationStoreKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export function NotificationCentre() {
  const [read, setRead] = useState<string[]>([]);
  const [filter, setFilter] = useState<'All' | 'Unread' | 'Read'>('All');

  useEffect(() => {
    setRead(readList());
    return onNoticesChanged(() => setRead(readList()));
  }, []);

  function persist(next: string[]) {
    setRead(next);
    try {
      window.localStorage.setItem(notificationStoreKey, JSON.stringify(next));
    } catch {
      /* browser storage is optional */
    }
    broadcastNoticesChanged();
  }

  const visible = useMemo(() => {
    if (filter === 'Unread') return seedNotices.filter((notice) => !read.includes(notice.id));
    if (filter === 'Read') return seedNotices.filter((notice) => read.includes(notice.id));
    return seedNotices;
  }, [filter, read]);

  const unread = seedNotices.filter((notice) => !read.includes(notice.id)).length;

  return (
    <section className="section-card" aria-labelledby="notification-list">
      <div className="section-head">
        <div>
          <h2 id="notification-list">All notifications</h2>
          <p className="hint">Marking an item read is stored in this browser only. No email or SMS exists in this build.</p>
        </div>
        <span className="badge badge-amber">{unread} unread</span>
      </div>

      <div className="workspace-toolbar">
        <div className="filter-bar" role="group" aria-label="Notification filters">
          {(['All', 'Unread', 'Read'] as const).map((item) => (
            <button key={item} type="button" className={`filter-chip ${filter === item ? 'active' : ''}`}
              aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}</button>
          ))}
        </div>
        <button type="button" className="chrome-button" onClick={() => persist(seedNotices.map((notice) => notice.id))} disabled={unread === 0}>
          Mark all read
        </button>
      </div>

      {visible.length > 0 ? (
        <div className="notification-list">
          {visible.map((notice) => {
            const isRead = read.includes(notice.id);
            return (
              <article className={`notification-item ${isRead ? '' : 'unread'}`} key={notice.id}>
                <div>
                  <h3>{notice.title}</h3>
                  <p>{notice.body}</p>
                  <p className="hint" style={{ marginTop: 6 }}>{notice.about} · {notice.received}</p>
                </div>
                <div className="notification-meta">
                  {isRead
                    ? <span className="badge badge-gray">Read</span>
                    : <button type="button" className="chrome-button" onClick={() => persist([...read, notice.id])}>Mark read</button>}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state" role="status">
          <span className="empty-icon">∅</span>
          <strong>{filter === 'Unread' ? 'Nothing unread' : 'Nothing read yet'}</strong>
          <p>Switch the filter back to All to see every sample notification.</p>
          <button type="button" className="button button-outline" onClick={() => setFilter('All')}>Clear filter</button>
        </div>
      )}

      <details className="state-preview">
        <summary>State previews for this list</summary>
        <div className="state-grid">
          <div className="state-card">
            <span className="eyebrow">Loading</span>
            <div className="skeleton-row" /><div className="skeleton-row" /><div className="skeleton-row" />
            <p className="hint">Shown while the notification request is in flight.</p>
          </div>
          <div className="state-card">
            <span className="eyebrow">Empty</span>
            <p className="hint">Nothing unread — the list explains how to clear the filter.</p>
          </div>
          <div className="state-card">
            <span className="eyebrow">Error</span>
            <p className="hint">If the request fails, the last good list stays on screen with a retry action.</p>
          </div>
        </div>
      </details>
    </section>
  );
}
