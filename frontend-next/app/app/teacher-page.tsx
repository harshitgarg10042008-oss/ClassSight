'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import { PageLayout } from '@/components/PageLayout';
import { api, type Room, type Camera, type Assignment, type Review, type TimetablePeriod } from '@/lib/api';
import { resizeCapture } from '@/lib/image';
import CameraCapture from '@/components/CameraCapture';

export default function TeacherPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [roomId, setRoomId] = useState<number | null>(null);
  const [assignmentId, setAssId] = useState<number | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<'webcam' | 'file'>('webcam');
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [reviewPhotoUrl, setReviewPhotoUrl] = useState<string|null>(null);
  const [ackUnknown, setAckUnknown] = useState(false);
  const [decisions, setDecisions] = useState<Record<number, 'PRESENT' | 'ABSENT'>>({});
  const [step, setStep] = useState<'select' | 'capture' | 'review'>('select');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [period, setPeriod] = useState<TimetablePeriod | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    Promise.all([
      api.getRooms(),
      api.getCameras(),
      api.getTeacherAssignments(),
    ]).then(([rms, cams, asgns]) => {
      setRooms(rms);
      setCameras(cams);
      setAssignments(asgns);
      setRoomId(rms[0]?.id ?? null);
      setAssId(asgns[0]?.id ?? null);
      api.getCurrentPeriod().then((p: TimetablePeriod) => {
        setPeriod(p);
        if (p.session) {
          const m = asgns.find(a => a.subject.id === p.session!.subjectId && a.classSection.id === p.session!.sectionId);
          if (m) setAssId(m.id);
          const rm = rms.find(r => r.id === p.session!.roomId);
          if (rm) setRoomId(rm.id);
        }
      }).catch(() => setPeriod(null));
    }).catch((err: unknown) => setMsg(err instanceof Error ? err.message : 'Unable to load the current period.'));
  }, []);

  useEffect(() => () => { if (reviewPhotoUrl) URL.revokeObjectURL(reviewPhotoUrl); }, [reviewPhotoUrl]);

  async function capture() {
    if (!photo || !roomId || !assignmentId || !cameras.some(camera => camera.room?.id === roomId)) {
      setMsg('Select a configured room, subject, and take a photo.');
      return;
    }
    setBusy(true);
    setReviewPhotoUrl(null); setAckUnknown(false); setDecisions({});
    setMsg('Running recognition pipeline…');
    try {
      const csrf = await api.getCsrf();
      const form = new FormData();
      form.append('image', photo);
      form.append('roomId', String(roomId));
      form.append('cameraId', String(cameras.find(c => c.room?.id === roomId)?.id ?? ''));
      form.append('assignmentId', String(assignmentId));
      if (period?.session?.id) form.append('classSessionId', String(period.session.id));
      const d = await api.capture(form, csrf.token);
      setSessionId(d.sessionId);
      setStep('review');
      setMsg(`Session #${d.sessionId} created.`);
      poll(d.sessionId);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Capture failed');
    } finally {
      setBusy(false);
    }
  }

  function poll(id: number) {
    let n = 0;
    let photoRequested = false;
    const tick = async () => {
      try {
        const d: Review = await api.getReview(id);
        setReview(d);
        if(!photoRequested){photoRequested=true;try{const blob=await api.getReviewPhoto(id);setReviewPhotoUrl(URL.createObjectURL(blob));}catch{/* text review remains available if photo storage is unavailable */}}
        if ((d.status === 'CAPTURED' || d.status === 'PROCESSING') && n < 60) {
          n++;
          setTimeout(tick, 1500);
        } else {
          setMsg(`Status: ${d.status}`);
        }
      } catch (err) {
        setMsg(err instanceof Error ? err.message : 'Poll error');
      }
    };
    tick();
  }

  async function finalize() {
    if (!sessionId || !review) return;
    setBusy(true);
    try {
      const csrf = await api.getCsrf();
      const d = await api.submitReview(
        sessionId,
        review.records.filter(r => decisions[r.studentId]).map(r => ({ studentId: r.studentId, decision: decisions[r.studentId] })),
        csrf.token,
        ackUnknown
      );
      setMsg(d.status === 'FINALIZED' ? `Session #${d.sessionId} finalized.` : `Session #${d.sessionId} remains in review; resolve every student first.`);
      poll(sessionId);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  const all = review?.allRecords || review?.records || [];
  const present = all.filter(r => r.status === 'PRESENT').length;
  const absent = all.filter(r => r.status === 'ABSENT').length;
  const inReview = review?.records?.length ?? 0;
  const progressPhase = review?.capturePhase || (review?.status === 'PROCESSING' ? 'DETECTING' : review?.status);

  return (
    <PageLayout pageId="teacher">
      <div>
        <div className="progress-steps">
          {(['select', 'capture', 'review'] as const).map((s, i) => (
            <div
              key={s}
              className={`step-pill ${step === s ? 'active' : (step === 'review' && s !== 'review') || (step === 'capture' && s === 'select') ? 'done' : ''}`}
              onClick={() => s !== 'review' && setStep(s)}
              style={{ cursor: s !== 'review' ? 'pointer' : 'default' }}
            >
              {i + 1}. {s === 'select' ? 'Class & Room' : s === 'capture' ? 'Photo Capture' : 'Results'}
            </div>
          ))}
        </div>

        {msg && <div className="alert alert-info">{msg}</div>}

        {step === 'select' && (
          <div className="section-card">
            {period?.session && (
              <div className="current-period-banner">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span className={`period-dot ${period.captureAllowed ? 'green' : 'amber'}`} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>
                      {period.session.subjectCode} — {period.session.subjectName}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: "'DM Mono',monospace" }}>
                      {period.session.sectionName} · {period.session.roomName} · {period.session.startTime}–{period.session.endTime}
                    </div>
                  </div>
                  <span className={`badge ${period.captureAllowed ? 'badge-green' : 'badge-amber'}`}>
                    {period.captureAllowed ? '● Capture Open' : '◌ Window Closed'}
                  </span>
                </div>
                <button
                  onClick={() => {
                    if (period.session) {
                      const m = assignments.find(a => a.subject.id === period.session!.subjectId && a.classSection.id === period.session!.sectionId);
                      if (m) setAssId(m.id);
                      const rm = rooms.find(r => r.id === period.session!.roomId);
                      if (rm) setRoomId(rm.id);
                      setStep('capture');
                    }
                  }}
                >
                  Use This Period →
                </button>
              </div>
            )}
            <div className="section-head">
              <div>
                <span className="eyebrow">Step 1</span>
                <h2>Select Class & Room</h2>
              </div>
            </div>
            <div className="form-grid-2">
              <label>
                Classroom / Room
                <select value={roomId ?? ''} onChange={e => setRoomId(Number(e.target.value))}>
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} · {r.building || 'Campus'} (Cap: {r.capacity ?? '—'})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Subject & Section
                <select value={assignmentId ?? ''} onChange={e => setAssId(Number(e.target.value))}>
                  {assignments.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.subject.code} — {a.subject.name} · {a.classSection.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div style={{ marginTop: 20 }}>
              <button className="btn-lg" onClick={() => setStep('capture')} disabled={!roomId || !assignmentId}>
                Continue to Capture →
              </button>
            </div>
          </div>
        )}

        {step === 'capture' && (
          <div className="section-card">
            <div className="section-head">
              <div>
                <span className="eyebrow">Step 2</span>
                <h2>Capture Classroom Photo</h2>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className={mode === 'webcam' ? '' : 'btn-secondary'} onClick={() => setMode('webcam')}>
                  📹 Webcam
                </button>
                <button className={mode === 'file' ? '' : 'btn-secondary'} onClick={() => setMode('file')}>
                  📂 File Upload
                </button>
              </div>
            </div>
            {mode === 'webcam' && <CameraCapture disabled={busy} captureLabel="Snap photo" onCapture={file => { setPhoto(file); setPhotoUrl(URL.createObjectURL(file)); setMsg('Photo ready!'); }} />}
            {mode === 'file' && (
              <label>
                Choose classroom photo
                <input type="file" accept="image/*" onChange={async e => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  try {
                    const resized = await resizeCapture(f);
                    setPhoto(resized);
                    setPhotoUrl(URL.createObjectURL(resized));
                    setMsg('Photo prepared for recognition.');
                  } catch (err) {
                    setMsg(err instanceof Error ? err.message : 'Unable to prepare photo');
                  }
                }} />
              </label>
            )}
            {photoUrl && (
              <div style={{ marginTop: 12 }}>
                <img src={photoUrl} alt="preview" style={{ width: '100%', borderRadius: 12, border: '1px solid var(--line)', maxHeight: 320, objectFit: 'contain', background: '#0f1c1a' }} />
              </div>
            )}
            <div style={{ marginTop: 20 }}>
              <button className="btn-lg" onClick={capture} disabled={!photo || busy}>
                {busy ? <><span className="spinner" />Processing…</> : 'Submit & Recognize →'}
              </button>
            </div>
          </div>
        )}

        {step === 'review' && review && (
          <div className="section-card">
            {(review.status === 'PROCESSING' || review.capturePhase === 'QUEUED') && (
              <div className="alert alert-info" role="status">
                Recognition progress: {progressPhase}
              </div>
            )}
            <div className="section-head">
              <div>
                <span className="eyebrow">Step 3</span>
                <h2>Results & Review</h2>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <span className="badge badge-green">🟢 {present} Present</span>
              <span className="badge badge-red">🔴 {absent} Absent</span>
              {inReview > 0 && <span className="badge badge-amber">🟡 {inReview} Review</span>}
            </div>
            {(review.diagnostics?.length ?? 0) < (review.allRecords?.length ?? 0) && (
              <div className="alert alert-warning">
                Many students may be too far or out of frame. Review the captured detections and resolve every expected student before finalizing.
              </div>
            )}
            {review.quality?.warning && <div className="alert alert-warning">{review.quality.warning}</div>}
            {review.status==='FAILED'&&<div className="alert alert-danger">{review.quality?.warning||'Recognition could not run. Confirm the selected class has active students and face references.'}</div>}
            {(review.unknownDetections||0)>0&&<div className="alert alert-warning">{review.unknownDetections} face(s) did not match the selected class roster. They are highlighted red; unassigned faces will be ignored after your acknowledgment.</div>}
            {review.diagnostics?.some(d => d.box?.length === 4) && (
              <div style={{ position: 'relative', marginBottom: 16 }}>
                <img src={reviewPhotoUrl||undefined} alt="Captured classroom photo with recognition boxes" style={{ display: 'block', width: '100%', borderRadius: 12 }} />
                {review.diagnostics.map((d, index) => {
                  if (!d.box || d.box.length !== 4 || !d.image_width_px || !d.image_height_px) return null;
                  const [top, right, bottom, left] = d.box;
                  const color = d.student_id == null ? '#ef4444' : d.recognition_state === 'RECOGNIZED' ? '#22c55e' : '#f59e0b';
                  return <div key={d.face_index ?? index} style={{
                    position: 'absolute', top: `${top / d.image_height_px * 100}%`, left: `${left / d.image_width_px * 100}%`,
                    width: `${(right - left) / d.image_width_px * 100}%`, height: `${(bottom - top) / d.image_height_px * 100}%`,
                    border: `3px solid ${color}`, background: `${color}22`, color, fontWeight: 800,
                  }}>#{(d.face_index ?? index) + 1}</div>;
                })}
              </div>
            )}
            <div className="student-grid">
              {all.map(r => (
                <div key={r.recordId} className="student-card">
                  <div style={{ fontWeight: 600 }}>{r.studentName}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.rollNumber}</div>
                  <div className={`status-pill ${r.status === 'PRESENT' ? 'status-green' : r.status === 'ABSENT' ? 'status-red' : 'status-amber'}`}>
                    {r.status}
                  </div>
                  <button type="button" className="btn-secondary" onClick={() => setShowDetails(!showDetails)}>
                    {showDetails ? 'Hide recognition details' : 'Show recognition details'}
                  </button>
                  {showDetails && (
                    <div className="table-wrap" style={{ marginTop: 16 }}>
                      <table>
                        <thead><tr><th>Face</th><th>Size</th><th>Best / second distance</th><th>Margin</th><th>State</th><th>Detector</th><th>Reason</th></tr></thead>
                        <tbody>{(review.diagnostics ?? []).map((d, index) => (
                          <tr key={d.face_index ?? index}>
                            <td>#{(d.face_index ?? index) + 1}</td>
                            <td>{d.face_width_px ?? '—'} × {d.face_height_px ?? '—'} px</td>
                            <td>{d.distance?.toFixed(4) ?? '—'} / {d.second_best_distance?.toFixed(4) ?? '—'}</td>
                            <td>{d.margin?.toFixed(4) ?? '—'}</td>
                            <td>{d.recognition_state ?? 'UNKNOWN'}</td>
                            <td>{d.detector ?? '—'} ({d.detector_scale ?? '—'})</td>
                            <td>{d.rejection_reason ?? 'Accepted'}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                      {review.timings && <p className="hint">Pipeline: {Object.entries(review.timings).map(([key, value]) => `${key} ${Number(value).toFixed(1)}ms`).join(' · ')}</p>}
                    </div>
                  )}
                  {r.confidenceScore && <div style={{ fontSize: 11, marginTop: 4 }}>Conf: {(r.confidenceScore * 100).toFixed(1)}%</div>}
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button
                      className={decisions[r.studentId] === 'PRESENT' ? 'btn-sm' : 'btn-sm btn-secondary'}
                      onClick={() => setDecisions({ ...decisions, [r.studentId]: 'PRESENT' })}
                    >
                      Present
                    </button>
                    <button
                      className={decisions[r.studentId] === 'ABSENT' ? 'btn-sm' : 'btn-sm btn-secondary'}
                      onClick={() => setDecisions({ ...decisions, [r.studentId]: 'ABSENT' })}
                    >
                      Absent
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {review.status==='REVIEW_REQUIRED'&&<div style={{ marginTop: 20 }}>
              {(review.unknownDetections||0)>0&&<label style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}><input type="checkbox" checked={ackUnknown} onChange={event=>setAckUnknown(event.target.checked)}/><span>I reviewed unknown detections; unassigned faces are intentionally ignored.</span></label>}
              <button className="btn-lg" onClick={finalize} disabled={busy||review.records.some(record=>!decisions[record.studentId])||((review.unknownDetections||0)>0&&!ackUnknown)}>
                {busy ? <><span className="spinner" />Finalizing…</> : 'Finalize Attendance'}
              </button>
            </div>}
            {review.status==='FINALIZED'&&<div className="alert alert-success" style={{marginTop:20}}>Attendance finalized after faculty review{review.finalizedBy?` by user ${review.finalizedBy}`:''}. ERP integration remains a local stub.</div>}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
