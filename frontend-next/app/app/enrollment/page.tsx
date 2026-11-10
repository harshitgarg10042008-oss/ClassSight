'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageLayout } from '@/components/PageLayout';
import { RouteState } from '@/components/RouteState';
import { TabNav, TabItem } from '@/components/ui/TabNav';
import { api, type StudentRosterItem } from '@/lib/api';
import { EnrollIcon, CameraIcon, CheckIcon, WarningIcon } from '@/components/ui/Icons';

export default function EnrollmentPage() {
  const [activeTab, setActiveTab] = useState<'single' | 'bulk' | 'roster'>('single');
  const [roster, setRoster] = useState<StudentRosterItem[]>([]);
  const [msg, setMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Single enroll form fields
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [classSectionId, setClassSectionId] = useState('1');
  const [photo, setPhoto] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);

  // Bulk enroll form fields
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [bulkConsent, setBulkConsent] = useState(false);

  function loadRoster() {
    setLoading(true);
    api.getStudentRoster()
      .then((data) => setRoster(Array.isArray(data) ? data : []))
      .catch((err: unknown) => setErrorMsg(err instanceof Error ? err.message : 'Unable to load enrollment.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadRoster();
  }, []);

  async function handleSingleEnroll(e: React.FormEvent) {
    e.preventDefault();
    if (!photo) {
      setErrorMsg('Please select or capture a face photo.');
      return;
    }
    if (!consent) {
      setErrorMsg('Biometric consent must be recorded prior to enrollment.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setMsg('');

    try {
      const csrf = await api.getCsrf();
      const form = new FormData();
      form.append('name', name);
      form.append('rollNumber', rollNumber);
      form.append('classSectionId', classSectionId);
      form.append('image', photo);
      form.append('consentGiven', 'true');

      await api.enrollStudent(form, csrf.token);
      setMsg(`Student ${name} (${rollNumber}) enrolled successfully with 128-d FaceNet embedding.`);
      setName('');
      setRollNumber('');
      setPhoto(null);
      setConsent(false);
      loadRoster();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Enrollment failed. Try another photo.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleBulkEnroll(e: React.FormEvent) {
    e.preventDefault();
    if (!csvFile || !zipFile) {
      setErrorMsg('Both CSV roster and ZIP archive of photos are required.');
      return;
    }
    if (!bulkConsent) {
      setErrorMsg('Institutional consent ledger verification required.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setMsg('');

    try {
      const csrf = await api.getCsrf();
      const form = new FormData();
      form.append('csv', csvFile);
      form.append('zip', zipFile);
      form.append('classSectionId', classSectionId);
      form.append('consentGiven', 'true');

      const res = await api.bulkEnroll(form, csrf.token);
      setMsg(`Batch enrolled: ${res.successCount} succeeded, ${res.failureCount} failed out of ${res.totalRows} rows.`);
      setCsvFile(null);
      setZipFile(null);
      loadRoster();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Bulk enrollment failed.');
    } finally {
      setSubmitting(false);
    }
  }

  const tabs: TabItem[] = [
    { id: 'single', label: 'Single Student Enrollment' },
    { id: 'bulk', label: 'Batch Upload (CSV + ZIP)' },
    { id: 'roster', label: `Enrolled Roster (${roster.length})` },
  ];

  return (
    <PageLayout
      title="Biometrics &amp; Face Enrollment"
      crumbs={[{ label: 'Workspace', href: '/app' }, { label: 'Enrollment' }]}
    >
      <div className="section-card" style={{ marginBottom: 24 }}>
        <div className="section-head">
          <div>
            <span className="eyebrow">Biometric Identity &bull; Feature FT02</span>
            <h2>Student Enrollment Portal</h2>
            <p className="hint">
              Register face embeddings into the classroom roster. Reference embeddings are mapped into 128-d orthonormal space via FaceNet.
            </p>
          </div>
          <span className="badge badge-green">128-d FaceNet Active</span>
        </div>

        {/* Tab Navigation with Zero Scrollbar Bug and Arrow Keys */}
        <TabNav
          items={tabs}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id as any)}
          ariaLabel="Enrollment Modes"
        />

        {msg && <div className="alert alert-success" style={{ marginBottom: 20 }}>{msg}</div>}
        {errorMsg && <div className="alert alert-danger" style={{ marginBottom: 20 }}>{errorMsg}</div>}

        {/* ── SINGLE ENROLLMENT ───────────────────────────────────── */}
        {activeTab === 'single' && (
          <form onSubmit={handleSingleEnroll} style={{ maxWidth: 620 }}>
            <div style={{ display: 'grid', gap: 16 }}>
              <label>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                  Full Student Name *
                </span>
                <input
                  type="text"
                  placeholder="e.g. Aarav Patel"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface)' }}
                />
              </label>

              <label>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                  Institutional Roll Number *
                </span>
                <input
                  type="text"
                  placeholder="e.g. CS-101"
                  required
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface)', fontFamily: 'monospace' }}
                />
              </label>

              <label>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                  Class Section *
                </span>
                <select
                  value={classSectionId}
                  onChange={(e) => setClassSectionId(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface)' }}
                >
                  <option value="1">CS-2026-A (Computer Science)</option>
                  <option value="2">CS-2026-B (Data Structures)</option>
                  <option value="3">EC-2026-A (Physics I)</option>
                </select>
              </label>

              <label>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                  Face Photo / Webcam Snapshot *
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  required
                  onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface)' }}
                />
                <span style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                  Frontal, evenly lit face photo without heavy glare or occlusion.
                </span>
              </label>

              <div style={{ padding: 14, border: '1px solid var(--line)', borderRadius: 8, background: 'var(--surface-raised)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    required
                    style={{ width: 18, height: 18 }}
                  />
                  <span>Student / Guardian has granted active biometric consent (DPDPA 2023 compliant).</span>
                </label>
              </div>

              <div>
                <button type="submit" className="button-primary cs-button" disabled={submitting}>
                  {submitting ? <span className="spinner" /> : <EnrollIcon size={16} />}
                  <span>{submitting ? 'Extracting Face Embedding...' : 'Enrol Student Biometrics'}</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ── BATCH ENROLLMENT ────────────────────────────────────── */}
        {activeTab === 'bulk' && (
          <form onSubmit={handleBulkEnroll} style={{ maxWidth: 620 }}>
            <div style={{ display: 'grid', gap: 16 }}>
              <label>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                  Class Section *
                </span>
                <select
                  value={classSectionId}
                  onChange={(e) => setClassSectionId(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface)' }}
                >
                  <option value="1">CS-2026-A (Computer Science)</option>
                  <option value="2">CS-2026-B (Data Structures)</option>
                  <option value="3">EC-2026-A (Physics I)</option>
                </select>
              </label>

              <label>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                  CSV Student Roster *
                </span>
                <input
                  type="file"
                  accept=".csv"
                  required
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface)' }}
                />
                <span style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                  Format: <code>roll_number, full_name, photo_filename</code>
                </span>
              </label>

              <label>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                  ZIP Archive of Photos *
                </span>
                <input
                  type="file"
                  accept=".zip"
                  required
                  onChange={(e) => setZipFile(e.target.files?.[0] || null)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface)' }}
                />
                <span style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                  Contains images named matching photo_filename column in CSV.
                </span>
              </label>

              <div style={{ padding: 14, border: '1px solid var(--line)', borderRadius: 8, background: 'var(--surface-raised)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={bulkConsent}
                    onChange={(e) => setBulkConsent(e.target.checked)}
                    required
                    style={{ width: 18, height: 18 }}
                  />
                  <span>I certify that biometric consent has been registered for all batch students.</span>
                </label>
              </div>

              <div>
                <button type="submit" className="button-primary cs-button" disabled={submitting}>
                  {submitting ? <span className="spinner" /> : <EnrollIcon size={16} />}
                  <span>{submitting ? 'Processing Batch ZIP...' : 'Execute Batch Enrollment'}</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ── ENROLLED ROSTER ─────────────────────────────────────── */}
        {activeTab === 'roster' && (
          <RouteState
            loading={loading}
            error={errorMsg}
            empty={roster.length === 0}
            emptyMessage="No students are enrolled yet."
          >
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Roll Number</th>
                    <th>Student Name</th>
                    <th>Biometric Status</th>
                    <th>Consent Ledger</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <Link href={`/app/students/${s.id}`} style={{ fontWeight: 700, fontFamily: 'monospace' }}>
                          {s.rollNumber}
                        </Link>
                      </td>
                      <td>
                        <Link href={`/app/students/${s.id}`} style={{ fontWeight: 600 }}>
                          {s.name}
                        </Link>
                      </td>
                      <td>
                        <span className={`status-pill ${s.faceRegistered ? 'status-green' : 'status-amber'}`}>
                          {s.faceRegistered ? '128-d Registered' : 'Missing Photo'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${s.consentGiven !== false ? 'badge-green' : 'badge-red'}`}>
                          {s.consentGiven !== false ? 'Consent Given' : 'Consent Pending'}
                        </span>
                      </td>
                      <td>
                        <Link href={`/app/students/${s.id}`} className="btn-sm btn-secondary" style={{ textDecoration: 'none' }}>
                          Profile →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </RouteState>
        )}
      </div>

      <section className="section-card" aria-labelledby="enrollment-honesty">
        <div className="section-head">
          <h2 id="enrollment-honesty">Privacy &amp; Biometric Security Notice</h2>
        </div>
        <ul className="honesty-list">
          <li>Face embeddings are not yet encrypted at rest.</li>
          <li>
            Single-capture attendance cannot be committed without the faculty review call; multi-shot finalise can finalise a clean accumulator by explicit faculty action.
          </li>
          <li>Raw face photographs are retained for audit and verification purposes according to institutional retention schedules.</li>
        </ul>
      </section>
    </PageLayout>
  );
}
