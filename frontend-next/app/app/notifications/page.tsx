'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PageLayout } from '@/components/PageLayout';
import { useApp } from '@/components/AppContext';
import { BellIcon, CheckIcon, ReviewIcon, TimetableIcon, LeaveIcon, CamerasIcon } from '@/components/ui/Icons';

export default function NotificationsCentrePage() {
  const { notifications, markNotificationRead, markAllNotificationsRead, unreadCount } = useApp();
  const [filter, setFilter] = useState<'all' | 'unread' | 'review' | 'timetable' | 'leave'>('all');

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    if (filter === 'review') return n.type === 'review';
    if (filter === 'timetable') return n.type === 'timetable';
    if (filter === 'leave') return n.type === 'leave';
    return true;
  });

  return (
    <PageLayout
      title="Notification Centre"
      crumbs={[{ label: 'Workspace', href: '/app' }, { label: 'Notifications' }]}
      isSampleData={true}
      actions={
        unreadCount > 0 ? (
          <button
            type="button"
            className="button-secondary cs-button"
            onClick={markAllNotificationsRead}
          >
            <CheckIcon size={16} />
            <span>Mark All as Read</span>
          </button>
        ) : undefined
      }
    >
      <div className="section-card" style={{ marginBottom: 24 }}>
        <div className="section-head">
          <div>
            <span className="eyebrow">Alerts &amp; Signals</span>
            <h2>System &amp; Classroom Notifications</h2>
            <p className="hint">
              Real-time updates regarding sessions awaiting faculty review, upcoming timetable periods, and student leave submissions.
            </p>
          </div>
          <span className="badge badge-blue">{unreadCount} Unread Alerts</span>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn-sm ${filter === 'all' ? '' : 'btn-secondary'}`}
            onClick={() => setFilter('all')}
          >
            All Alerts ({notifications.length})
          </button>
          <button
            type="button"
            className={`btn-sm ${filter === 'unread' ? '' : 'btn-secondary'}`}
            onClick={() => setFilter('unread')}
          >
            Unread ({unreadCount})
          </button>
          <button
            type="button"
            className={`btn-sm ${filter === 'review' ? '' : 'btn-secondary'}`}
            onClick={() => setFilter('review')}
          >
            Review Queues
          </button>
          <button
            type="button"
            className={`btn-sm ${filter === 'timetable' ? '' : 'btn-secondary'}`}
            onClick={() => setFilter('timetable')}
          >
            Timetable
          </button>
          <button
            type="button"
            className={`btn-sm ${filter === 'leave' ? '' : 'btn-secondary'}`}
            onClick={() => setFilter('leave')}
          >
            Leave Requests
          </button>
        </div>
      </div>

      <div className="section-card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              No notifications matching this filter.
            </div>
          ) : (
            filtered.map((n) => (
              <div
                key={n.id}
                style={{
                  padding: 16,
                  borderRadius: 10,
                  border: '1px solid var(--line)',
                  backgroundColor: n.read ? 'var(--surface)' : 'rgba(14, 159, 154, 0.05)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 16,
                }}
              >
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 999,
                      backgroundColor: 'var(--surface-raised)',
                      border: '1px solid var(--line)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--lagoon-600)',
                      flexShrink: 0,
                    }}
                  >
                    {n.type === 'review' ? <ReviewIcon size={18} /> : n.type === 'timetable' ? <TimetableIcon size={18} /> : n.type === 'leave' ? <LeaveIcon size={18} /> : <BellIcon size={18} />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      {!n.read && <span style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: 'var(--lagoon-500)', display: 'inline-block' }} />}
                      <span>{n.title}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>
                      {n.description}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-slate)', marginTop: 6 }}>
                      {n.timestamp} &bull; Category: {n.type.toUpperCase()}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  {!n.read && (
                    <button
                      type="button"
                      className="btn-sm btn-secondary"
                      onClick={() => markNotificationRead(n.id)}
                    >
                      Mark Read
                    </button>
                  )}
                  {n.link && (
                    <Link href={n.link} className="btn-sm" style={{ textDecoration: 'none' }}>
                      Open →
                    </Link>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </PageLayout>
  );
}
