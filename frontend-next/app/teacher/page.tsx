'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import { PageLayout } from '@/components/PageLayout';
import { api, type Room, type Camera, type Assignment, type Review, type TimetablePeriod } from '@/lib/api';
import { resizeCapture } from '@/lib/image';

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
  const [decisions, setDecisions] = useState<Record<number, 'PRESENT' | 'ABSENT'>>({});
  const [step, setStep] = useState<'select' | 'capture' | 'review'>('select');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [period, setPeriod] = useState<TimetablePeriod | null>(null);
  const [camErr, setCamErr] = useState('');
  const [camOn, setCamOn] = useState(false);
  const vidRef = useRef<HTMLVideoElement | null>(null);
  const strmRef = useRef<MediaStream | null>(null);

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
    }).catch(err => setMsg(err.message));
  }, []);

  async function startCam() {
    setCamErr('');
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1920 }, height: { ideal: 1080 } } });
      strmRef.current = s;
      if (vidRef.current) {
        vidRef.current.srcObject = s;
        await vidRef.current.play();
      }
      setCamOn(true);
    } catch (e) {
      setCamErr(`Camera: ${e instanceof Error ? e.message : 'error'}. Use File Upload instead.`);
      setCamOn(false);
    }
  }

  function stopCam() {
    strmRef.current?.getTracks().forEach(t => t.stop());
    strmRef.current = null;
    setCamOn(false);
  }

  useEffect(() => {
    if (step === 'capture' && mode === 'webcam') startCam();
    else stopCam();
    return stopCam;
  }, [step, mode]);

  function snap() {
    if (!vidRef.current) return;
    const v = vidRef.current, c = document.createElement('canvas');
    c.width = v.videoWidth || 1280;
    c.height = v.videoHeight || 720;
    c.getContext('2d')?.drawImage(v, 0, 0, c.width, c.height);
    c.toBlob(blob => {
      if (!blob) return;
      const f = new File([blob], `att-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setPhoto(f);
      setPhotoUrl(URL.createObjectURL(f));
      setMsg('Photo ready!');
    }, 'image/jpeg', 0.92);
  }

  async function capture() {
    if (!photo || !roomId || !assignmentId) {
      setMsg('Select room, subject, and take a photo.');
      return;
    }
    setBusy(true);
    setMsg('Running recognition pipeline…');
    stopCam();
    try {
      const csrf = await api.getCsrf();
      const form = new FormData();
      form.append('image', photo);
      form.append('roomId', String(roomId));
      form.append('cameraId', String(cameras.find(c => c.room?.id === roomId)?.id ?? 1));
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
    const tick = async () => {
      try {
        const d: Review = await api.getReview(id);
        setReview(d);
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
        csrf.token
      );
      setMsg(`Session #${d.sessionId} finalized.`);
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
                <button className={mode === 'file' ? '' : 'btn-secondary'} onClick={() => { stopCam(); setMode('file'); }}>
                  📂 File Upload
                </button>
              </div>
            </div>
            {mode === 'webcam' && (camErr
              ? <div className="alert alert-danger">{camErr}</div>
              : <div className="webcam-wrap">
                <video ref={vidRef} autoPlay playsInline muted style={{ width: '100%', maxHeight: 420, display: 'block', objectFit: 'cover' }} />
                <div className="webcam-actions">
                  <button onClick={snap} style={{ boxShadow: '0 4px 16px rgba(0,0,0,.4)' }}>📸 Snap Photo</button>
                  {camOn ? <button className="btn-secondary" onClick={stopCam}>Pause</button> : <button className="btn-secondary" onClick={startCam}>Restart</button>}
                </div>
              </div>
            )}
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
            {review.quality?.warning && <div className="alert alert-warning">{review.quality.warning}</div>}
            <div className="student-grid">
              {all.map(r => (
                <div key={r.recordId} className="student-card">
                  <div style={{ fontWeight: 600 }}>{r.studentName}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.rollNumber}</div>
                  <div className={`status-pill ${r.status === 'PRESENT' ? 'status-green' : r.status === 'ABSENT' ? 'status-red' : 'status-amber'}`}>
                    {r.status}
                  </div>
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
            <div style={{ marginTop: 20 }}>
              <button className="btn-lg" onClick={finalize} disabled={busy}>
                {busy ? <><span className="spinner" />Finalizing…</> : 'Finalize Attendance'}
              </button>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
