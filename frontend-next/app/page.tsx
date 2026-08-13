'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import './globals.css';

type Room = { id: number; name: string; building?: string; floor?: number; capacity?: number; active: boolean };
type Camera = { id: number; name: string; status: string; room?: { id: number } };
type Assignment = { id: number; subject: { id: number; code: string; name: string }; classSection: { id: number; name: string; academicYear: number }; active: boolean };
type ReviewRecord = { recordId: number; studentId: number; studentName: string; rollNumber: string; status: string; recognitionState?: 'RECOGNIZED' | 'UNKNOWN' | 'LOW_CONFIDENCE' | 'RECAPTURE_REQUIRED' | string; confidenceScore?: number; qualityWarning?: string };
type Review = { sessionId: number; status: string; records: ReviewRecord[]; allRecords?: ReviewRecord[]; capturedPhotoPath?: string; photoUrl: string; quality?: { qualityPassed?: boolean; warning?: string; blurScore?: number; brightnessMean?: number } };

const API = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8080';

export default function FacultyFlow() {
  const [token, setToken] = useState('');
  const [usernameOrEmail, setUsernameOrEmail] = useState('teacher');
  const [password, setPassword] = useState('teacher123');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [roomId, setRoomId] = useState<number | null>(null);
  const [assignmentId, setAssignmentId] = useState<number | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [decisions, setDecisions] = useState<Record<number, 'PRESENT' | 'ABSENT'>>({});
  const [step, setStep] = useState<'login' | 'select' | 'capture' | 'review'>('login');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function api(path: string, options: RequestInit = {}) {
    const headers = new Headers(options.headers);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(`${API}${path}`, { ...options, headers });
    if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`);
    return response;
  }

  async function login(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const response = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usernameOrEmail, password }) });
      if (!response.ok) throw new Error(`Login rejected (${response.status})`);
      const data = await response.json(); setToken(data.token); setStep('select'); setMessage(`Signed in as ${data.fullName} (${data.role}).`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Login failed'); }
    finally { setBusy(false); }
  }

  useEffect(() => {
    if (!token) return;
    Promise.all([api('/api/rooms').then(r => r.json()), api('/api/cameras').then(r => r.json()), api('/teacher/assignments').then(r => r.json())])
      .then(([roomData, cameraData, assignmentData]) => { setRooms(roomData); setCameras(cameraData); setAssignments(assignmentData); setRoomId(roomData[0]?.id ?? null); setAssignmentId(assignmentData[0]?.id ?? null); })
      .catch(error => setMessage(error instanceof Error ? error.message : 'Could not load faculty options'));
  }, [token]);

  const selectedCamera = useMemo(() => cameras.find(camera => camera.room?.id === roomId) || cameras[0], [cameras, roomId]);

  async function capture() {
    if (!photo || !roomId || !assignmentId) { setMessage('Choose a room, assignment, and a real image file first.'); return; }
    setBusy(true); setMessage('Uploading capture and waiting for recognition…');
    try {
      const csrf = await api('/csrf').then(r => r.json());
      const form = new FormData(); form.append('image', photo); form.append('roomId', String(roomId)); form.append('cameraId', String(selectedCamera?.id || 1)); form.append('assignmentId', String(assignmentId));
      const response = await api('/capture', { method: 'POST', headers: { 'X-XSRF-TOKEN': csrf.token }, body: form });
      const data = await response.json(); setSessionId(data.sessionId); setStep('review'); setMessage(`Capture ${data.sessionId} accepted (${data.sessionStatus}).`); poll(data.sessionId);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Capture failed'); }
    finally { setBusy(false); }
  }

  function poll(id: number) {
    let attempts = 0;
    const tick = async () => {
      try {
        const data: Review = await api(`/api/attendance-sessions/${id}/review`).then(r => r.json()); setReview(data);
        if (data.status === 'CAPTURED' || data.status === 'PROCESSING') { attempts += 1; if (attempts < 60) setTimeout(tick, 1000); }
        else setMessage(`Recognition complete: ${data.status}.`);
      } catch (error) { setMessage(error instanceof Error ? error.message : 'Review polling failed'); }
    };
    tick();
  }

  async function finalize() {
    if (!sessionId || !review) return; setBusy(true);
    try {
      const csrf = await api('/csrf').then(r => r.json());
      const payload = { decisions: review.records.filter(record => decisions[record.studentId]).map(record => ({ studentId: record.studentId, decision: decisions[record.studentId] })) };
      const response = await api(`/api/attendance-sessions/${sessionId}/review`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': csrf.token }, body: JSON.stringify(payload) });
      const data = await response.json(); setMessage(`Session ${data.sessionId} finalized with ${data.unresolvedReviewCount} unresolved review item(s).`); poll(sessionId);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Finalization failed'); }
    finally { setBusy(false); }
  }

  return <main className="shell">
    <header><span className="eyebrow">CLASSSIGHT / FACULTY</span><h1>Capture attendance with confidence.</h1><p className="lede">An additive Next.js faculty flow using the existing Spring Boot APIs. Authentication stays in memory and is never written to localStorage.</p></header>
    <div className="status" role="status">{message || 'Live API-backed faculty workspace.'}</div>
    <section className="progress"><span className={step === 'login' ? 'active' : ''}>01 Login</span><span className={step === 'select' ? 'active' : ''}>02 Select</span><span className={step === 'capture' ? 'active' : ''}>03 Capture</span><span className={step === 'review' ? 'active' : ''}>04 Review</span></section>
    {step === 'login' && <form className="card form" onSubmit={login}><label>Username or email<input value={usernameOrEmail} onChange={e => setUsernameOrEmail(e.target.value)} /></label><label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} /></label><button disabled={busy}>{busy ? 'Signing in…' : 'Sign in as faculty'}</button></form>}
    {step === 'select' && <section className="card form"><div className="grid"><label>Room<select value={roomId ?? ''} onChange={e => setRoomId(Number(e.target.value))}>{rooms.map(room => <option key={room.id} value={room.id}>{room.name} · {room.building || 'Campus'} · capacity {room.capacity || '—'}</option>)}</select></label><label>Subject / class<select value={assignmentId ?? ''} onChange={e => setAssignmentId(Number(e.target.value))}>{assignments.map(assignment => <option key={assignment.id} value={assignment.id}>{assignment.subject.code} — {assignment.subject.name} · {assignment.classSection.name}</option>)}</select></label></div><p className="hint">{selectedCamera ? `Camera ${selectedCamera.name} is ${selectedCamera.status}.` : 'No online camera was returned; browser capture will use the selected room camera record.'}</p><button onClick={() => setStep('capture')} disabled={!roomId || !assignmentId}>Continue to capture</button></section>}
    {step === 'capture' && <section className="card form"><label>Real classroom photo<input type="file" accept="image/*" onChange={(event: ChangeEvent<HTMLInputElement>) => setPhoto(event.target.files?.[0] || null)} /></label>{photo && <p className="hint">{photo.name} · {(photo.size / 1024 / 1024).toFixed(2)} MB</p>}<div className="actions"><button className="secondary" onClick={() => setStep('select')}>Back</button><button onClick={capture} disabled={busy || !photo}>{busy ? 'Processing…' : 'Capture and recognize'}</button></div></section>}
    {step === 'review' && <section className="card"><div className="review-head"><div><span className="eyebrow">SESSION {sessionId}</span><h2>{review?.status || 'Waiting for recognition…'}</h2>{review?.quality?.warning && <p className="hint">Capture quality warning: {review.quality.warning}</p>}</div>{review?.photoUrl && <a href={`${API}${review.photoUrl}`} target="_blank" rel="noreferrer">Open stored photo</a>}</div>{(review?.allRecords?.length || review?.records?.length) ? <div className="records">{(review.allRecords || review.records).map(record => <div className="record" key={record.recordId}><div><strong>{record.studentName}</strong><small>{record.rollNumber} · {record.status} · {record.recognitionState || 'UNKNOWN'} · confidence {record.confidenceScore ?? '—'}</small><small>{record.qualityWarning || 'No warning'}</small></div><div className="actions"><button className={decisions[record.studentId] === 'PRESENT' ? 'selected' : 'secondary'} onClick={() => setDecisions({...decisions, [record.studentId]: 'PRESENT'})}>Present</button><button className={decisions[record.studentId] === 'ABSENT' ? 'selected' : 'secondary'} onClick={() => setDecisions({...decisions, [record.studentId]: 'ABSENT'})}>Absent</button></div></div>)}</div> : <p className="hint">Recognition is processing. This screen polls the existing review endpoint and will update automatically.</p>}{review?.records?.length ? <button onClick={finalize} disabled={busy || review.records.some(record => !decisions[record.studentId])}>{busy ? 'Finalizing…' : 'Finalize attendance'}</button> : null}</section>}
    <footer>Existing Thymeleaf pages remain untouched. API base: <code>{API}</code></footer>
  </main>;
}
