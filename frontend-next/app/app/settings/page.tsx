'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageLayout } from '@/components/PageLayout';
import { TabNav, TabItem } from '@/components/ui/TabNav';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useApp } from '@/components/AppContext';
import { SettingsIcon, UserIcon, LockIcon, BellIcon, GlobeIcon, CheckIcon } from '@/components/ui/Icons';

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'profile';

  const [activeTab, setActiveTab] = useState(initialTab);
  const { user, language, setLanguage } = useApp();
  const [savedMsg, setSavedMsg] = useState('');

  const tabs: TabItem[] = [
    { id: 'profile', label: 'Faculty Profile' },
    { id: 'security', label: 'Security & Auth' },
    { id: 'notifications', label: 'Notification Preferences' },
    { id: 'appearance', label: 'Appearance & Theme' },
    { id: 'language', label: 'Language & Locale' },
    { id: 'accessibility', label: 'Accessibility' },
  ];

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSavedMsg('Settings updated. Demo mode, nothing was sent.');
    setTimeout(() => setSavedMsg(''), 4500);
  }

  return (
    <PageLayout
      title="Faculty Account &amp; App Settings"
      crumbs={[{ label: 'Workspace', href: '/app' }, { label: 'Settings' }]}
      isSampleData={true}
    >
      <div className="section-card" style={{ marginBottom: 24 }}>
        <div className="section-head">
          <div>
            <span className="eyebrow">Preferences &amp; Customization</span>
            <h2>Settings &amp; Workspace Controls</h2>
          </div>
        </div>

        {/* Tab Navigation with Arrow Keys & Zero Scrollbar Bug */}
        <TabNav
          items={tabs}
          activeId={activeTab}
          onChange={setActiveTab}
          ariaLabel="Settings sections"
        />

        {savedMsg && (
          <div className="alert alert-success" style={{ marginBottom: 20 }}>
            {savedMsg}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSave} style={{ maxWidth: 640 }}>
            <h3 style={{ fontSize: 16, marginBottom: 16 }}>Personal &amp; Department Information</h3>
            <div style={{ display: 'grid', gap: 14 }}>
              <label>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Full Name</span>
                <input type="text" defaultValue={user.fullName} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface)' }} />
              </label>
              <label>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Institutional Email</span>
                <input type="email" defaultValue="r.sharma@institution.edu" style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface)' }} />
              </label>
              <label>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Department &amp; Designation</span>
                <input type="text" defaultValue="Computer Science & Engineering — Associate Professor" style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface)' }} />
              </label>
              <label>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Faculty Employee ID</span>
                <input type="text" defaultValue="FAC-2024-089" disabled style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface-raised)', opacity: 0.8 }} />
              </label>
              <div style={{ marginTop: 12 }}>
                <button type="submit" className="button-primary cs-button">Save Changes</button>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 12 }}>Demo mode, nothing was sent.</span>
              </div>
            </div>
          </form>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <form onSubmit={handleSave} style={{ maxWidth: 640 }}>
            <h3 style={{ fontSize: 16, marginBottom: 16 }}>Authentication &amp; Password Management</h3>
            <div style={{ display: 'grid', gap: 14 }}>
              <label>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Current Password</span>
                <input type="password" placeholder="••••••••" style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface)' }} />
              </label>
              <label>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>New Password</span>
                <input type="password" placeholder="At least 8 characters..." style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface)' }} />
              </label>
              <div style={{ padding: 14, border: '1px solid var(--line)', borderRadius: 8, background: 'var(--surface-raised)' }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Two-Factor Authentication (2FA)</div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 10px' }}>Requires TOTP authenticator app verification upon login.</p>
                <span className="badge badge-green">2FA Enabled</span>
              </div>
              <div style={{ marginTop: 12 }}>
                <button type="submit" className="button-primary cs-button">Update Security Settings</button>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 12 }}>Demo mode, nothing was sent.</span>
              </div>
            </div>
          </form>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <form onSubmit={handleSave} style={{ maxWidth: 640 }}>
            <h3 style={{ fontSize: 16, marginBottom: 16 }}>Alert Channels &amp; Delivery Preferences</h3>
            <div style={{ display: 'grid', gap: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 600 }}>
                <input type="checkbox" defaultChecked style={{ width: 18, height: 18 }} />
                <span>Email alert when attendance session requires faculty review</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 600 }}>
                <input type="checkbox" defaultChecked style={{ width: 18, height: 18 }} />
                <span>Daily morning digest of scheduled lecture periods</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 600 }}>
                <input type="checkbox" defaultChecked style={{ width: 18, height: 18 }} />
                <span>Instant alert when student files an attendance dispute</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 600 }}>
                <input type="checkbox" style={{ width: 18, height: 18 }} />
                <span>Weekly summary of defaulters below 75% attendance</span>
              </label>
              <div style={{ marginTop: 12 }}>
                <button type="submit" className="button-primary cs-button">Save Notification Rules</button>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 12 }}>Demo mode, nothing was sent.</span>
              </div>
            </div>
          </form>
        )}

        {/* Appearance Tab */}
        {activeTab === 'appearance' && (
          <div style={{ maxWidth: 640 }}>
            <h3 style={{ fontSize: 16, marginBottom: 16 }}>Interface Theme &amp; Color Scheme</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 18, border: '1px solid var(--line)', borderRadius: 10, background: 'var(--surface-raised)' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Theme Mode Toggle (Sun / Moon)</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  Switch between ClassSight Light Mode and Dark Cyber-Ink theme. Persists automatically in browser local storage.
                </div>
              </div>
              <ThemeToggle />
            </div>
            <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)' }}>
              Theme preference is synchronized with your system OS dark mode preferences by default.
            </div>
          </div>
        )}

        {/* Language Tab */}
        {activeTab === 'language' && (
          <div style={{ maxWidth: 640 }}>
            <h3 style={{ fontSize: 16, marginBottom: 16 }}>Language &amp; Localization</h3>
            <div style={{ padding: 18, border: '1px solid var(--line)', borderRadius: 10, background: 'var(--surface-raised)' }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Select Display Language</div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  className={`btn-sm ${language === 'en' ? '' : 'btn-secondary'}`}
                  onClick={() => setLanguage('en')}
                >
                  English (Default)
                </button>
                <button
                  type="button"
                  className={`btn-sm ${language === 'hi' ? '' : 'btn-secondary'}`}
                  onClick={() => setLanguage('hi')}
                >
                  हिन्दी (Hindi)
                </button>
              </div>
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                Notice: Hindi localization is currently partial (आंशिक). Core headers, navigation, and alerts are translated.
              </div>
            </div>
          </div>
        )}

        {/* Accessibility Tab */}
        {activeTab === 'accessibility' && (
          <form onSubmit={handleSave} style={{ maxWidth: 640 }}>
            <h3 style={{ fontSize: 16, marginBottom: 16 }}>Accessibility &amp; Assistive Features</h3>
            <div style={{ display: 'grid', gap: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 600 }}>
                <input type="checkbox" style={{ width: 18, height: 18 }} />
                <span>Reduce animations and UI motion effects</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 600 }}>
                <input type="checkbox" defaultChecked style={{ width: 18, height: 18 }} />
                <span>High-contrast text badges and status indicators</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 600 }}>
                <input type="checkbox" defaultChecked style={{ width: 18, height: 18 }} />
                <span>Enable keyboard focus outline rings</span>
              </label>
              <div style={{ marginTop: 12 }}>
                <button type="submit" className="button-primary cs-button">Save Accessibility Preferences</button>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 12 }}>Demo mode, nothing was sent.</span>
              </div>
            </div>
          </form>
        )}
      </div>
    </PageLayout>
  );
}
