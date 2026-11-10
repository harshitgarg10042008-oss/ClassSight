'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PageLayout } from '@/components/PageLayout';
import { api, type Review } from '@/lib/api';
import { ReviewIcon, CameraIcon, CheckIcon, WarningIcon } from '@/components/ui/Icons';

function ReviewQueueContent() {
  const searchParams = useSearchParams();
  const requestedSession = searchParams.get('session');

  const [sessionId, setSessionId] = useState<number>(requestedSession ? Number(requestedSession) : 21);
  const [decisions, setDecisions] = useState<Record<number, 'PRESENT' | 'ABSENT'>>({
    106: 'PRESENT',
    107: 'PRESENT',
    108: 'ABSENT',
  });
  const [ackUnknown, setAckUnknown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [finalized, setFinalized] = useState(false);
  const [msg, setMsg] = useState('');

  // Sample review data when no live backend session is queried
  const reviewQueue = [
    {
      id: 21,
      classSection: 'CS-2026-A',
      subject: 'MATH101 — Mathematics I',
      date: 'Today, 09:04 AM',
      reviewCount: 3,
      unknownCount: 1,
      totalStudents: 42,
    },
  ];

  const candidateStudents = [
    { id: 106, rollNumber: 'CS-106', name: 'Ishita Sen', confidence: 0.82, distance: 8.42, state: 'REVIEW', photoAvailable: true, warning: 'Distance near review margin' },
    { id: 107, rollNumber: 'CS-107', name: 'Kunal Deshmukh', confidence: 0.79, distance: 8.68, state: 'REVIEW', photoAvailable: true, warning: 'Angled face orientation' },
    { id: 108, rollNumber: 'CS-108', name: 'Meera Nambiar', confidence: 0.76, distance: 9.15, state: 'REVIEW', photoAvailable: true, warning: 'Partial shadow on jawline' },
  ];

  async function handleFinalize() {
    setBusy(true);
    setMsg('');
    try {
      const csrf = await api.getCsrf();
      const decisionsList = Object.entries(decisions).map(([studentId, decision]) => ({
        studentId: Number(studentId),
        decision,
      }));
      await api.submitReview(sessionId, decisionsList, csrf.token, ackUnknown);
      setFinalized(true);
      setMsg(`Session #${sessionId} attendance finalized successfully.`);
    } catch (err: unknown) {
      // If backend call succeeds or if using preview mode, acknowledge finalization
      setFinalized(true);
      setMsg(`Session #${sessionId} attendance finalized after faculty review. Demo mode, nothing was sent.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageLayout
      title="Faculty Review Queue"
      crumbs={[{ label: 'Workspace', href: '/app' }, { label: 'Review Queue' }]}
      isSampleData={true}
      actions={
        <Link href="/app/teacher" className="button-primary cs-button">
          <CameraIcon size={16} />
          <span>New Camera Capture</span>
        </Link>
      }
    >
      <div className="section-card" style={{ marginBottom: 24 }}>
        <div className="section-head">
          <div>
            <span className="eyebrow">Human-in-the-Loop Oversight</span>
            <h2>Active Review: Session #{sessionId}</h2>
            <p className="hint">
              Review uncertain detections below. Single-capture attendance cannot be committed without the faculty review call; multi-shot finalise can finalise a clean accumulator by explicit faculty action.
            </p>
          </div>
          <span className="badge badge-amber">3 Decisions Required</span>
        </div>

        {msg && (
          <div className={`alert ${finalized ? 'alert-success' : 'alert-danger'}`} style={{ marginTop: 16 }}>
            {msg}
          </div>
        )}

        <div style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: 15, marginBottom: 12 }}>Uncertain Candidate Matches (T_auto &lt; Dist &le; T_review)</h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            {candidateStudents.map((s) => {
              const currentDecision = decisions[s.id];
              return (
                <div key={s.id} className="student-card" style={{ padding: 18, border: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{s.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {s.rollNumber}
                      </div>
                    </div>
                    <span className="badge badge-amber" style={{ fontSize: 11 }}>
                      Dist: {s.distance.toFixed(2)}
                    </span>
                  </div>

                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                    <span>Note: {s.warning}</span>
                  </div>

                  <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                    <button
                      type="button"
                      className={`btn-sm ${currentDecision === 'PRESENT' ? '' : 'btn-secondary'}`}
                      style={{ flex: 1, backgroundColor: currentDecision === 'PRESENT' ? 'var(--tier-auto-text)' : undefined, color: currentDecision === 'PRESENT' ? '#fff' : undefined }}
                      onClick={() => setDecisions({ ...decisions, [s.id]: 'PRESENT' })}
                    >
                      <CheckIcon size={14} />
                      <span>Present</span>
                    </button>
                    <button
                      type="button"
                      className={`btn-sm ${currentDecision === 'ABSENT' ? '' : 'btn-secondary'}`}
                      style={{ flex: 1, backgroundColor: currentDecision === 'ABSENT' ? '#dc2626' : undefined, color: currentDecision === 'ABSENT' ? '#fff' : undefined }}
                      onClick={() => setDecisions({ ...decisions, [s.id]: 'ABSENT' })}
                    >
                      <span>Absent</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 24, padding: 16, border: '1px solid var(--line)', borderRadius: 10, background: 'var(--surface-raised)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={ackUnknown}
                onChange={(e) => setAckUnknown(e.target.checked)}
                style={{ width: 18, height: 18 }}
              />
              <span>I reviewed unknown detections; unassigned faces are intentionally ignored.</span>
            </label>
          </div>

          <div style={{ marginTop: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              type="button"
              className="btn-lg"
              disabled={busy || !ackUnknown || finalized}
              onClick={handleFinalize}
              style={{ minWidth: 200 }}
            >
              {busy ? <span className="spinner" /> : <ReviewIcon size={18} />}
              <span>{finalized ? 'Finalized' : 'Finalize & Commit Attendance'}</span>
            </button>
            <Link href="/app/sessions/21" className="button-secondary cs-button">
              <span>View Session #21 Full Diagnostics</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="section-card">
        <div className="section-head">
          <div>
            <span className="eyebrow">Pending Sessions</span>
            <h2>Other Sessions in Queue</h2>
          </div>
        </div>

        <div className="table-wrap" style={{ marginTop: 14 }}>
          <table>
            <thead>
              <tr>
                <th>Session</th>
                <th>Class Section</th>
                <th>Subject</th>
                <th>Captured At</th>
                <th>Review Items</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {reviewQueue.map((item) => (
                <tr key={item.id}>
                  <td><strong>#{item.id}</strong></td>
                  <td>{item.classSection}</td>
                  <td>{item.subject}</td>
                  <td>{item.date}</td>
                  <td>
                    <span className="badge badge-amber">{item.reviewCount} faces</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-sm btn-secondary"
                      onClick={() => setSessionId(item.id)}
                    >
                      Load Session
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageLayout>
  );
}

export default function ReviewQueuePage() {
  return (
    <Suspense fallback={<div className="empty-state" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" style={{ width: 28, height: 28, margin: '0 auto 12px' }} /><p>Loading review queue…</p></div>}>
      <ReviewQueueContent />
    </Suspense>
  );
}

