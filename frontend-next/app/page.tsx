'use client';

import {
  ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState,
} from 'react';
import './globals.css';

// ─── Types ────────────────────────────────────────────────────────────────────
type Room = { id: number; name: string; building?: string; capacity?: number; active: boolean };
type Camera = { id: number; name: string; status: string; room?: { id: number } };
type Assignment = {
  id: number;
  subject: { id: number; code: string; name: string };
  classSection: { id: number; name: string; academicYear: number };
  active: boolean;
};
type ReviewRecord = {
  recordId: number; studentId: number; studentName: string; rollNumber: string;
  status: string; recognitionState?: string; confidenceScore?: number; qualityWarning?: string;
};
type Review = {
  sessionId: number; status: string; records: ReviewRecord[]; allRecords?: ReviewRecord[];
  photoUrl: string;
  quality?: { warning?: string };
};
type StudentRosterItem = {
  id: number; rollNumber: string; name: string; active: boolean;
  createdAt: string; faceRegistered: boolean;
};
type BulkEnrollResponse = {
  totalRows: number; successCount: number; failureCount: number;
  results: { rollNumber: string; name: string; success: boolean; message: string }[];
};
type TimetablePeriod = {
  session: {
    id: number; date: string; startTime: string; endTime: string; status: string;
    subjectCode: string; subjectName: string; subjectId: number;
    sectionName: string; sectionId: number;
    teacherUsername: string; roomId: number; roomName: string;
  } | null;
  captureAllowed: boolean; windowOpen: string; windowClose: string;
};
type TimetableSession = {
  id: number; date: string; startTime: string; endTime: string; status: string;
  subjectCode?: string; sectionName?: string; roomName?: string;
};
type TimetableSlot = {
  id: number; dayOfWeek: number; startTime: string; endTime: string;
  subjectCode?: string; subjectName?: string;
  sectionName?: string; teacherUsername?: string; roomName?: string;
};
type Dispute = {
  id: number; studentName?: string; rollNumber?: string;
  sessionDate?: string; subjectCode?: string;
  status: string; reason: string; resolvedNote?: string; createdAt: string;
};
type AuditLog = {
  id: number; studentName?: string; rollNumber?: string;
  fieldChanged: string; oldValue?: string; newValue?: string;
  changedByUsername?: string; changedAt: string; reason?: string;
};
type AnalyticsStudent = {
  studentId: number; studentName: string; rollNumber: string;
  attended: number; total: number; percentage: number;
  subjectName?: string; subjectCode?: string;
};
type AnalyticsSummary = {
  subjectCode: string; subjectName: string; sectionName: string;
  students: AnalyticsStudent[];
  averageAttendance: number; shortfallCount: number;
};

const DAY = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const API = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8080';

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function ClassSightApp() {
  const [token, setToken]           = useState('');
  const [userFullName, setFullName] = useState('');
  const [userRole, setRole]         = useState('');
  const [page, setPage]             = useState('teacher');
  const [loginErr, setLoginErr]     = useState('');
  const [loginBusy, setLoginBusy]   = useState(false);
  const [username, setUsername]     = useState('teacher');
  const [password, setPassword]     = useState('teacher123');

  function onLoginSuccess(tok: string, name: string, role: string) {
    setToken(tok); setFullName(name); setRole(role);
    if (role === 'ADMIN') setPage('admin');
    else if (role === 'HOD') setPage('hod');
    else if (role === 'STUDENT') setPage('student');
    else setPage('teacher');
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault(); setLoginBusy(true); setLoginErr('');
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrEmail: username, password }),
      });
      if (!res.ok) throw new Error(`Login failed (${res.status})`);
      const d = await res.json();
      onLoginSuccess(d.token, d.fullName || d.username, d.role);
    } catch (err) { setLoginErr(err instanceof Error ? err.message : 'Login failed'); }
    finally { setLoginBusy(false); }
  }

  const authFetch = useCallback(async (path: string, opts: RequestInit = {}) => {
    const headers = new Headers(opts.headers);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const res = await fetch(`${API}${path}`, { ...opts, headers });
    if (!res.ok) { const t = await res.text(); throw new Error(`${res.status}: ${t}`); }
    return res;
  }, [token]);

  const getCsrf = useCallback(() => authFetch('/csrf').then(r => r.json()), [authFetch]);

  // ── Login screen
  if (!token) {
    return (
      <div className="login-shell">
        <div className="login-card">
          <div className="login-logo">
            <div className="login-logo-icon">C</div>
            <div>
              <div className="login-logo-text">ClassSight</div>
              <div style={{ fontSize: 11, color: '#4a6b5c', fontFamily: "'DM Mono',monospace", marginTop: 2 }}>INTELLIGENT ATTENDANCE</div>
            </div>
          </div>
          <h1>Welcome back</h1>
          <p>Sign in to your institutional portal</p>
          <form className="login-form" onSubmit={handleLogin}>
            {loginErr && <div className="login-error">{loginErr}</div>}
            <label>Username or Email<input value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" /></label>
            <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" /></label>
            <button className="login-btn" disabled={loginBusy}>
              {loginBusy ? <><span className="spinner" />Signing in…</> : 'Sign In →'}
            </button>
          </form>
          <div className="login-hint">Demo: <code>teacher/teacher123</code> · <code>admin/admin123</code></div>
        </div>
      </div>
    );
  }

  const navItems = [
    ...(['TEACHER','ADMIN','HOD'].includes(userRole) ? [
      { id: 'teacher',    label: 'Take Attendance', icon: '📷' },
      { id: 'enrollment', label: 'Enrollment',       icon: '👤' },
      { id: 'analytics',  label: 'Analytics',        icon: '📊' },
    ] : []),
    ...(userRole === 'STUDENT' ? [{ id: 'student', label: 'My Attendance', icon: '🎓' }] : []),
    ...(['HOD','ADMIN'].includes(userRole) ? [{ id: 'hod', label: 'Disputes & Audit', icon: '⚖️' }] : []),
    ...(userRole === 'ADMIN' ? [{ id: 'admin', label: 'Timetable Admin', icon: '🗓️' }] : []),
  ];

  const initials = userFullName.split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?';

  return (
    <div className="app-layout">
      <nav className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark">
            <div className="logo-icon">C</div>
            <div><div className="logo-text">ClassSight</div><div className="logo-sub">Attendance Hub</div></div>
          </div>
        </div>
        <div className="sidebar-user">
          <div className="user-avatar">{initials}</div>
          <div><div className="user-name">{userFullName}</div><div className="user-role-badge">{userRole}</div></div>
        </div>
        <div className="sidebar-nav">
          <div className="nav-section-label">Navigation</div>
          {navItems.map(item => (
            <button key={item.id} className={`nav-item ${page === item.id ? 'active' : ''}`} onClick={() => setPage(item.id)}>
              <span className="nav-icon">{item.icon}</span>{item.label}
            </button>
          ))}
        </div>
        <div className="sidebar-footer">
          <button onClick={() => { setToken(''); setFullName(''); setRole(''); }}>🚪 Sign Out</button>
        </div>
      </nav>

      <div className="main-content">
        <div className="top-bar">
          <div>
            <div className="page-title">{navItems.find(n => n.id === page)?.label ?? 'Dashboard'}</div>
            <div className="page-subtitle">ClassSight · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
          </div>
        </div>
        <div className="content-area">
          {page === 'teacher'    && <TeacherPage    authFetch={authFetch} getCsrf={getCsrf} />}
          {page === 'enrollment' && <EnrollmentPage authFetch={authFetch} getCsrf={getCsrf} />}
          {page === 'analytics'  && <AnalyticsPage  authFetch={authFetch} />}
          {page === 'hod'        && <HodPage        authFetch={authFetch} getCsrf={getCsrf} />}
          {page === 'admin'      && <AdminPage      authFetch={authFetch} getCsrf={getCsrf} />}
          {page === 'student'    && <StudentPage    authFetch={authFetch} getCsrf={getCsrf} />}
        </div>
      </div>
    </div>
  );
}

// ─── TEACHER PAGE ─────────────────────────────────────────────────────────────
function TeacherPage({ authFetch, getCsrf }: {
  authFetch: (p: string, o?: RequestInit) => Promise<Response>;
  getCsrf: () => Promise<{ token: string }>;
}) {
  const [rooms, setRooms]             = useState<Room[]>([]);
  const [cameras, setCameras]         = useState<Camera[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [roomId, setRoomId]           = useState<number | null>(null);
  const [assignmentId, setAssId]      = useState<number | null>(null);
  const [photo, setPhoto]             = useState<File | null>(null);
  const [photoUrl, setPhotoUrl]       = useState<string | null>(null);
  const [mode, setMode]               = useState<'webcam' | 'file'>('webcam');
  const [sessionId, setSessionId]     = useState<number | null>(null);
  const [review, setReview]           = useState<Review | null>(null);
  const [decisions, setDecisions]     = useState<Record<number, 'PRESENT' | 'ABSENT'>>({});
  const [step, setStep]               = useState<'select' | 'capture' | 'review'>('select');
  const [msg, setMsg]                 = useState('');
  const [busy, setBusy]               = useState(false);
  const [period, setPeriod]           = useState<TimetablePeriod | null>(null);
  const [camErr, setCamErr]           = useState('');
  const [camOn, setCamOn]             = useState(false);
  const vidRef  = useRef<HTMLVideoElement | null>(null);
  const strmRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    Promise.all([
      authFetch('/api/rooms').then(r => r.json()),
      authFetch('/api/cameras').then(r => r.json()),
      authFetch('/teacher/assignments').then(r => r.json()),
    ]).then(([rms, cams, asgns]) => {
      setRooms(rms); setCameras(cams); setAssignments(asgns);
      setRoomId(rms[0]?.id ?? null); setAssId(asgns[0]?.id ?? null);
      authFetch('/api/timetable/current-period').then(r => r.json()).then((p: TimetablePeriod) => {
        setPeriod(p);
        if (p.session) {
          const m = (asgns as Assignment[]).find(a => a.subject.id === p.session!.subjectId && a.classSection.id === p.session!.sectionId);
          if (m) setAssId(m.id);
          const rm = (rms as Room[]).find(r => r.id === p.session!.roomId);
          if (rm) setRoomId(rm.id);
        }
      }).catch(() => setPeriod(null));
    }).catch(err => setMsg(err.message));
  }, [authFetch]);

  async function startCam() {
    setCamErr('');
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1920 }, height: { ideal: 1080 } } });
      strmRef.current = s;
      if (vidRef.current) { vidRef.current.srcObject = s; await vidRef.current.play(); }
      setCamOn(true);
    } catch (e) { setCamErr(`Camera: ${e instanceof Error ? e.message : 'error'}. Use File Upload instead.`); setCamOn(false); }
  }

  function stopCam() { strmRef.current?.getTracks().forEach(t => t.stop()); strmRef.current = null; setCamOn(false); }

  useEffect(() => {
    if (step === 'capture' && mode === 'webcam') startCam(); else stopCam();
    return stopCam;
  }, [step, mode]);

  function snap() {
    if (!vidRef.current) return;
    const v = vidRef.current, c = document.createElement('canvas');
    c.width = v.videoWidth || 1280; c.height = v.videoHeight || 720;
    c.getContext('2d')?.drawImage(v, 0, 0, c.width, c.height);
    c.toBlob(blob => {
      if (!blob) return;
      const f = new File([blob], `att-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setPhoto(f); setPhotoUrl(URL.createObjectURL(f)); setMsg('Photo ready!');
    }, 'image/jpeg', 0.92);
  }

  async function capture() {
    if (!photo || !roomId || !assignmentId) { setMsg('Select room, subject, and take a photo.'); return; }
    setBusy(true); setMsg('Running recognition pipeline…'); stopCam();
    try {
      const csrf = await getCsrf();
      const form = new FormData();
      form.append('image', photo);
      form.append('roomId', String(roomId));
      form.append('cameraId', String(cameras.find(c => c.room?.id === roomId)?.id ?? 1));
      form.append('assignmentId', String(assignmentId));
      if (period?.session?.id) form.append('classSessionId', String(period.session.id));
      const d = await authFetch('/capture', { method: 'POST', headers: { 'X-XSRF-TOKEN': csrf.token }, body: form }).then(r => r.json());
      setSessionId(d.sessionId); setStep('review'); setMsg(`Session #${d.sessionId} created.`);
      poll(d.sessionId);
    } catch (err) { setMsg(err instanceof Error ? err.message : 'Capture failed'); }
    finally { setBusy(false); }
  }

  function poll(id: number) {
    let n = 0;
    const tick = async () => {
      try {
        const d: Review = await authFetch(`/api/attendance-sessions/${id}/review`).then(r => r.json());
        setReview(d);
        if ((d.status === 'CAPTURED' || d.status === 'PROCESSING') && n < 60) { n++; setTimeout(tick, 1500); }
        else setMsg(`Status: ${d.status}`);
      } catch (err) { setMsg(err instanceof Error ? err.message : 'Poll error'); }
    };
    tick();
  }

  async function finalize() {
    if (!sessionId || !review) return;
    setBusy(true);
    try {
      const csrf = await getCsrf();
      const d = await authFetch(`/api/attendance-sessions/${sessionId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': csrf.token },
        body: JSON.stringify({ decisions: review.records.filter(r => decisions[r.studentId]).map(r => ({ studentId: r.studentId, decision: decisions[r.studentId] })) }),
      }).then(r => r.json());
      setMsg(`Session #${d.sessionId} finalized.`);
      poll(sessionId);
    } catch (err) { setMsg(err instanceof Error ? err.message : 'Error'); }
    finally { setBusy(false); }
  }

  const all = review?.allRecords || review?.records || [];
  const present = all.filter(r => r.status === 'PRESENT').length;
  const absent  = all.filter(r => r.status === 'ABSENT').length;
  const inReview = review?.records?.length ?? 0;

  return (
    <div>
      <div className="progress-steps">
        {(['select','capture','review'] as const).map((s, i) => (
          <div key={s} className={`step-pill ${step === s ? 'active' : (step === 'review' && s !== 'review') || (step === 'capture' && s === 'select') ? 'done' : ''}`}
            onClick={() => s !== 'review' && setStep(s)} style={{ cursor: s !== 'review' ? 'pointer' : 'default' }}>
            {i + 1}. {s === 'select' ? 'Class & Room' : s === 'capture' ? 'Photo Capture' : 'Results'}
          </div>
        ))}
      </div>

      {msg && <div className="alert alert-info">{msg}</div>}

      {step === 'select' && (
        <div className="section-card">
          {period?.session && (
            <div className="current-period-banner">
              <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                <span className={`period-dot ${period.captureAllowed ? 'green' : 'amber'}`} />
                <div>
                  <div style={{ fontWeight:800, fontSize:15 }}>{period.session.subjectCode} — {period.session.subjectName}</div>
                  <div style={{ fontSize:12, color:'var(--muted)', fontFamily:"'DM Mono',monospace" }}>
                    {period.session.sectionName} · {period.session.roomName} · {period.session.startTime}–{period.session.endTime}
                  </div>
                </div>
                <span className={`badge ${period.captureAllowed ? 'badge-green' : 'badge-amber'}`}>
                  {period.captureAllowed ? '● Capture Open' : '◌ Window Closed'}
                </span>
              </div>
              <button onClick={() => { if (period.session) { const m = assignments.find(a => a.subject.id === period.session!.subjectId && a.classSection.id === period.session!.sectionId); if (m) setAssId(m.id); const rm = rooms.find(r => r.id === period.session!.roomId); if (rm) setRoomId(rm.id); setStep('capture'); } }}>
                Use This Period →
              </button>
            </div>
          )}
          <div className="section-head"><div><span className="eyebrow">Step 1</span><h2>Select Class & Room</h2></div></div>
          <div className="form-grid-2">
            <label>Classroom / Room
              <select value={roomId ?? ''} onChange={e => setRoomId(Number(e.target.value))}>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.name} · {r.building || 'Campus'} (Cap: {r.capacity ?? '—'})</option>)}
              </select>
            </label>
            <label>Subject & Section
              <select value={assignmentId ?? ''} onChange={e => setAssId(Number(e.target.value))}>
                {assignments.map(a => <option key={a.id} value={a.id}>{a.subject.code} — {a.subject.name} · {a.classSection.name}</option>)}
              </select>
            </label>
          </div>
          <div style={{ marginTop:20 }}>
            <button className="btn-lg" onClick={() => setStep('capture')} disabled={!roomId || !assignmentId}>Continue to Capture →</button>
          </div>
        </div>
      )}

      {step === 'capture' && (
        <div className="section-card">
          <div className="section-head">
            <div><span className="eyebrow">Step 2</span><h2>Capture Classroom Photo</h2></div>
            <div style={{ display:'flex', gap:8 }}>
              <button className={mode === 'webcam' ? '' : 'btn-secondary'} onClick={() => setMode('webcam')}>📹 Webcam</button>
              <button className={mode === 'file' ? '' : 'btn-secondary'} onClick={() => { stopCam(); setMode('file'); }}>📂 File Upload</button>
            </div>
          </div>
          {mode === 'webcam' && (camErr
            ? <div className="alert alert-danger">{camErr}</div>
            : <div className="webcam-wrap">
                <video ref={vidRef} autoPlay playsInline muted style={{ width:'100%', maxHeight:420, display:'block', objectFit:'cover' }} />
                <div className="webcam-actions">
                  <button onClick={snap} style={{ boxShadow:'0 4px 16px rgba(0,0,0,.4)' }}>📸 Snap Photo</button>
                  {camOn ? <button className="btn-secondary" onClick={stopCam}>Pause</button> : <button className="btn-secondary" onClick={startCam}>Restart</button>}
                </div>
              </div>
          )}
          {mode === 'file' && (
            <label>Choose classroom photo
              <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { setPhoto(f); setPhotoUrl(URL.createObjectURL(f)); } }} />
            </label>
          )}
          {photoUrl && <div style={{ marginTop:12 }}>
            <img src={photoUrl} alt="preview" style={{ width:'100%', borderRadius:12, border:'1px solid var(--line)', maxHeight:320, objectFit:'contain', background:'#0f1c1a' }} />
            <p className="hint" style={{ marginTop:6 }}>Ready · {photo ? (photo.size / 1024).toFixed(0) + ' KB' : ''}</p>
          </div>}
          <div style={{ display:'flex', gap:10, marginTop:20 }}>
            <button className="btn-secondary" onClick={() => { stopCam(); setStep('select'); }}>← Back</button>
            <button onClick={capture} disabled={busy || !photo}>{busy ? <><span className="spinner" />Processing…</> : 'Submit & Recognize →'}</button>
          </div>
        </div>
      )}

      {step === 'review' && (
        <div className="section-card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:12 }}>
            <div><span className="eyebrow">Session #{sessionId}</span><h2>Status: {review?.status || 'Processing…'}</h2></div>
            <div style={{ display:'flex', gap:8 }}>
              <span className="badge badge-green">{present} Present</span>
              <span className="badge badge-red">{absent} Absent</span>
              {inReview > 0 && <span className="badge badge-amber">{inReview} Review</span>}
            </div>
          </div>
          {review?.quality?.warning && <div className="alert alert-warn">⚠️ {review.quality.warning}</div>}
          {all.length > 0 ? (<>
            <div className="records-list">
              {all.map(rec => {
                const ip = rec.status === 'PRESENT', ia = rec.status === 'ABSENT';
                return (
                  <div className="record-item" key={rec.recordId}>
                    <div className="record-info">
                      <strong>{rec.studentName}
                        <span className={`badge ${ip ? 'badge-green' : ia ? 'badge-red' : 'badge-amber'}`} style={{ marginLeft:8 }}>{rec.status}</span>
                        {rec.recognitionState && <span className="badge badge-gray" style={{ marginLeft:4, fontSize:10 }}>{rec.recognitionState}</span>}
                      </strong>
                      <small>Roll: <code>{rec.rollNumber}</code>{rec.confidenceScore != null && <> · {(rec.confidenceScore * 100).toFixed(1)}%</>}</small>
                    </div>
                    <div className="record-actions">
                      <button className={`btn-sm ${decisions[rec.studentId] === 'PRESENT' || (ip && !decisions[rec.studentId]) ? '' : 'btn-secondary'}`}
                        onClick={() => setDecisions({ ...decisions, [rec.studentId]: 'PRESENT' })}>✓ Present</button>
                      <button className={`btn-sm ${decisions[rec.studentId] === 'ABSENT' || (ia && !decisions[rec.studentId]) ? 'btn-danger' : 'btn-secondary'}`}
                        onClick={() => setDecisions({ ...decisions, [rec.studentId]: 'ABSENT' })}>✗ Absent</button>
                    </div>
                  </div>
                );
              })}
            </div>
            {inReview > 0
              ? <div style={{ marginTop:20, paddingTop:16, borderTop:'1px solid var(--line)' }}>
                  <p className="hint" style={{ marginBottom:12 }}>{inReview} item(s) require manual confirmation.</p>
                  <button className="btn-lg" onClick={finalize} disabled={busy || review!.records.some(r => !decisions[r.studentId])}>
                    {busy ? <><span className="spinner" />Finalizing…</> : 'Finalize Attendance Session'}
                  </button>
                </div>
              : <div className="alert alert-success" style={{ marginTop:16 }}>✅ Auto-finalized — all students resolved with zero pending reviews.</div>
            }
          </>) : (
            <div className="empty-state"><span className="empty-icon">⏳</span><p>Recognition engine processing… polling every 1.5 s</p></div>
          )}
          <div style={{ marginTop:20 }}>
            <button className="btn-secondary" onClick={() => { setStep('capture'); setReview(null); setPhoto(null); setPhotoUrl(null); }}>← Take Another Photo</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ENROLLMENT PAGE ──────────────────────────────────────────────────────────
function EnrollmentPage({ authFetch, getCsrf }: {
  authFetch: (p: string, o?: RequestInit) => Promise<Response>;
  getCsrf: () => Promise<{ token: string }>;
}) {
  const [tab, setTab]               = useState<'bulk'|'single'|'roster'>('bulk');
  const [roster, setRoster]         = useState<StudentRosterItem[]>([]);
  const [loadingRoster, setLR]      = useState(false);
  const [busy, setBusy]             = useState(false);
  const [msg, setMsg]               = useState('');
  const [bulkCsv, setBulkCsv]       = useState<File|null>(null);
  const [bulkZip, setBulkZip]       = useState<File|null>(null);
  const [bulkPhotos, setBulkPhotos] = useState<FileList|null>(null);
  const [bulkRes, setBulkRes]       = useState<BulkEnrollResponse|null>(null);
  const [sName, setSName]           = useState('');
  const [sRoll, setSRoll]           = useState('');
  const [sPhoto, setSPhoto]         = useState<File|null>(null);
  const [sUrl, setSUrl]             = useState<string|null>(null);
  const [camOn, setCamOn]           = useState(false);
  const vidRef = useRef<HTMLVideoElement|null>(null);
  const strmRef = useRef<MediaStream|null>(null);

  const loadRoster = useCallback(async () => {
    setLR(true);
    try { setRoster(await authFetch('/students').then(r => r.json())); } catch {}
    finally { setLR(false); }
  }, [authFetch]);

  useEffect(() => { loadRoster(); }, [loadRoster]);

  async function startCam() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode:'user' } });
      strmRef.current = s;
      if (vidRef.current) { vidRef.current.srcObject = s; await vidRef.current.play(); }
      setCamOn(true);
    } catch (e) { setMsg(`Camera: ${e instanceof Error ? e.message : 'error'}`); }
  }
  function stopCam() { strmRef.current?.getTracks().forEach(t => t.stop()); strmRef.current = null; setCamOn(false); }
  function snap() {
    if (!vidRef.current) return;
    const v = vidRef.current, c = document.createElement('canvas');
    c.width = v.videoWidth || 640; c.height = v.videoHeight || 480;
    c.getContext('2d')?.drawImage(v, 0, 0, c.width, c.height);
    c.toBlob(blob => { if (!blob) return; const f = new File([blob], `${sRoll||'student'}.jpg`, { type:'image/jpeg' }); setSPhoto(f); setSUrl(URL.createObjectURL(blob)); stopCam(); }, 'image/jpeg', 0.92);
  }

  async function doBulk(e: FormEvent) {
    e.preventDefault();
    if (!bulkCsv) { setMsg('Select a CSV file.'); return; }
    if (!bulkZip && (!bulkPhotos || bulkPhotos.length === 0)) { setMsg('Provide ZIP or photos.'); return; }
    setBusy(true); setMsg('Running facial pipeline…');
    try {
      const csrf = await getCsrf(), form = new FormData();
      form.append('csvFile', bulkCsv);
      if (bulkZip) form.append('zipFile', bulkZip);
      if (bulkPhotos) for (let i = 0; i < bulkPhotos.length; i++) form.append('photos', bulkPhotos[i]);
      const d: BulkEnrollResponse = await authFetch('/students/bulk-enroll', { method:'POST', headers:{ 'X-XSRF-TOKEN':csrf.token }, body:form }).then(r => r.json());
      setBulkRes(d); setMsg(`Done: ${d.successCount} enrolled, ${d.failureCount} failed.`); loadRoster();
    } catch (err) { setMsg(err instanceof Error ? err.message : 'Error'); }
    finally { setBusy(false); }
  }

  async function doSingle(e: FormEvent) {
    e.preventDefault();
    if (!sName.trim() || !sRoll.trim() || !sPhoto) { setMsg('Name, roll, and photo required.'); return; }
    setBusy(true); setMsg('Enrolling…');
    try {
      const csrf = await getCsrf(), form = new FormData();
      form.append('name', sName.trim()); form.append('rollNumber', sRoll.trim()); form.append('consentGiven', 'true'); form.append('photo', sPhoto);
      const d = await authFetch('/students/enroll-single', { method:'POST', headers:{ 'X-XSRF-TOKEN':csrf.token }, body:form }).then(r => r.json());
      const s = d.student || d; setMsg(`✅ ${s.name} (${s.rollNumber}) enrolled!`);
      setSName(''); setSRoll(''); setSPhoto(null); setSUrl(null); loadRoster();
    } catch (err) { setMsg(err instanceof Error ? err.message : 'Error'); }
    finally { setBusy(false); }
  }

  return (
    <div>
      {msg && <div className="alert alert-info">{msg}</div>}
      <div className="inner-tabs">
        {(['bulk','single','roster'] as const).map(t => (
          <button key={t} className={`inner-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'bulk' ? '📦 Bulk Import' : t === 'single' ? '👤 Single Student' : `📋 Roster (${roster.length})`}
          </button>
        ))}
      </div>

      {tab === 'bulk' && (
        <div className="section-card">
          <div className="section-head">
            <div><span className="eyebrow">Bulk Onboarding</span><h2>Import from CSV</h2></div>
            <a href={`${API}/students/template.csv`} download="students-template.csv"
              style={{ padding:'10px 16px', background:'var(--card-2)', border:'1px solid var(--line)', borderRadius:10, textDecoration:'none', fontSize:13, fontWeight:700, color:'var(--ink)', display:'inline-block' }}>
              ⬇ Template
            </a>
          </div>
          <form onSubmit={doBulk} className="form-grid">
            <div className="form-grid-2">
              <label>CSV file (*.csv)<input type="file" accept=".csv" onChange={e => setBulkCsv(e.target.files?.[0] ?? null)} /><span className="hint">Columns: <code>roll_number,name</code></span></label>
              <label>Photos ZIP (*.zip)<input type="file" accept=".zip" onChange={e => setBulkZip(e.target.files?.[0] ?? null)} /><span className="hint">Files named <code>rollnumber.jpg</code></span></label>
            </div>
            <label>Or select multiple photo files<input type="file" multiple accept="image/*" onChange={e => setBulkPhotos(e.target.files)} /><span className="hint">{bulkPhotos ? `${bulkPhotos.length} selected` : 'Multiple files ok'}</span></label>
            <button type="submit" className="btn-lg" disabled={busy || !bulkCsv || (!bulkZip && (!bulkPhotos || bulkPhotos.length === 0))}>
              {busy ? <><span className="spinner" />Running…</> : '🚀 Start Bulk Enrollment'}
            </button>
          </form>
          {bulkRes && (
            <div style={{ marginTop:24 }}>
              <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:14 }}>
                <h3>Results</h3>
                <span className="badge badge-green">{bulkRes.successCount} OK</span>
                {bulkRes.failureCount > 0 && <span className="badge badge-red">{bulkRes.failureCount} Failed</span>}
              </div>
              <div className="table-wrap"><table>
                <thead><tr><th>Roll</th><th>Name</th><th>Status</th><th>Message</th></tr></thead>
                <tbody>{bulkRes.results.map(row => (
                  <tr key={row.rollNumber}>
                    <td><code>{row.rollNumber}</code></td><td><strong>{row.name}</strong></td>
                    <td><span className={`badge ${row.success ? 'badge-green' : 'badge-red'}`}>{row.success ? 'OK' : 'FAIL'}</span></td>
                    <td style={{ fontSize:12, color: row.success ? 'var(--success-text)' : 'var(--danger-text)' }}>{row.message}</td>
                  </tr>
                ))}</tbody>
              </table></div>
            </div>
          )}
        </div>
      )}

      {tab === 'single' && (
        <div className="section-card">
          <span className="eyebrow">Manual Enrollment</span><h2>Add Single Student</h2>
          <form onSubmit={doSingle} className="form-grid" style={{ marginTop:20 }}>
            <div className="form-grid-2">
              <label>Full Name<input placeholder="e.g. Harsh Garg" value={sName} onChange={e => setSName(e.target.value)} /></label>
              <label>Roll Number<input placeholder="e.g. 2501320100129" value={sRoll} onChange={e => setSRoll(e.target.value)} /></label>
            </div>
            <div>
              <div style={{ display:'flex', gap:8, marginBottom:10 }}>
                <button type="button" onClick={startCam} className={camOn ? '' : 'btn-secondary'}>📸 Camera</button>
                {camOn && <button type="button" className="btn-secondary" onClick={stopCam}>Close</button>}
              </div>
              {camOn && <div className="webcam-wrap" style={{ maxWidth:400 }}>
                <video ref={vidRef} autoPlay playsInline muted style={{ width:'100%', display:'block' }} />
                <div className="webcam-actions"><button type="button" onClick={snap}>Snap Face</button></div>
              </div>}
              <label style={{ marginTop:10 }}>Or upload photo<input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0] ?? null; setSPhoto(f); if (f) setSUrl(URL.createObjectURL(f)); }} /></label>
              {sUrl && <img src={sUrl} alt="preview" style={{ width:'100%', borderRadius:12, border:'1px solid var(--line)', maxHeight:180, objectFit:'contain', marginTop:10 }} />}
            </div>
            <button type="submit" className="btn-lg" disabled={busy || !sName.trim() || !sRoll.trim() || !sPhoto}>
              {busy ? <><span className="spinner" />Enrolling…</> : '✅ Enroll Student'}
            </button>
          </form>
        </div>
      )}

      {tab === 'roster' && (
        <div className="section-card">
          <div className="section-head">
            <div><span className="eyebrow">Database</span><h2>Enrolled Students ({roster.length})</h2></div>
            <button className="btn-secondary btn-sm" onClick={loadRoster}>{loadingRoster ? '↻ Refreshing…' : '↻ Refresh'}</button>
          </div>
          {roster.length === 0
            ? <div className="empty-state"><span className="empty-icon">📭</span><p>No students enrolled yet.</p></div>
            : <div className="table-wrap"><table>
                <thead><tr><th>Roll</th><th>Name</th><th>Face</th><th>Enrolled</th><th>Status</th></tr></thead>
                <tbody>{roster.map(s => (
                  <tr key={s.id}>
                    <td><code>{s.rollNumber}</code></td><td><strong>{s.name}</strong></td>
                    <td><span className={`badge ${s.faceRegistered ? 'badge-green' : 'badge-red'}`}>{s.faceRegistered ? '✓ Registered' : '✗ Missing'}</span></td>
                    <td><small>{s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '—'}</small></td>
                    <td><span className={`badge ${s.active ? 'badge-blue' : 'badge-gray'}`}>{s.active ? 'ACTIVE' : 'INACTIVE'}</span></td>
                  </tr>
                ))}</tbody>
              </table></div>
          }
        </div>
      )}
    </div>
  );
}

// ─── ANALYTICS PAGE ───────────────────────────────────────────────────────────
function AnalyticsPage({ authFetch }: { authFetch: (p: string, o?: RequestInit) => Promise<Response> }) {
  const [tab, setTab]               = useState<'overview'|'detail'>('overview');
  const [summary, setSummary]       = useState<AnalyticsSummary|null>(null);
  const [allSum, setAllSum]         = useState<AnalyticsSummary[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignId, setAssignId]     = useState<number|null>(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  useEffect(() => {
    authFetch('/teacher/assignments').then(r => r.json()).then(d => { setAssignments(d); if (d.length > 0) setAssignId(d[0].id); }).catch(() => {});
  }, [authFetch]);

  async function loadDetail() {
    if (!assignId) return;
    setLoading(true); setError('');
    try { setSummary(await authFetch(`/api/analytics/assignment/${assignId}`).then(r => r.json())); }
    catch (err) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setLoading(false); }
  }

  async function loadAll() {
    setLoading(true); setError('');
    try { const d = await authFetch('/api/analytics/all').then(r => r.json()); setAllSum(Array.isArray(d) ? d : [d]); }
    catch (err) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setLoading(false); }
  }

  function dlExcel() { if (!assignId) return; const a = document.createElement('a'); a.href = `${API}/api/analytics/assignment/${assignId}/xlsx`; a.download = `attendance-${assignId}.xlsx`; a.click(); }
  function dlPdf()   { if (!assignId) return; const a = document.createElement('a'); a.href = `${API}/api/analytics/assignment/${assignId}/pdf`;  a.download = `attendance-${assignId}.pdf`;  a.click(); }

  const bc = (p: number) => p >= 75 ? '' : p >= 60 ? 'warn' : 'danger';

  return (
    <div>
      <div className="inner-tabs">
        <button className={`inner-tab ${tab === 'overview' ? 'active' : ''}`} onClick={() => { setTab('overview'); loadAll(); }}>📊 Overview</button>
        <button className={`inner-tab ${tab === 'detail' ? 'active' : ''}`} onClick={() => setTab('detail')}>🔍 Subject Detail</button>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}

      {tab === 'detail' && (
        <div className="section-card">
          <div className="section-head">
            <div><span className="eyebrow">Analytics</span><h2>Attendance Report</h2></div>
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn-secondary btn-sm" onClick={dlExcel} disabled={!summary}>⬇ Excel</button>
              <button className="btn-secondary btn-sm" onClick={dlPdf}   disabled={!summary}>⬇ PDF</button>
            </div>
          </div>
          <div style={{ display:'flex', gap:10, alignItems:'flex-end', marginBottom:20, flexWrap:'wrap' }}>
            <label style={{ flex:1, minWidth:200 }}>Subject & Section
              <select value={assignId ?? ''} onChange={e => setAssignId(Number(e.target.value))}>
                {assignments.map(a => <option key={a.id} value={a.id}>{a.subject.code} — {a.subject.name} · {a.classSection.name}</option>)}
              </select>
            </label>
            <button onClick={loadDetail} disabled={loading || !assignId}>{loading ? <><span className="spinner" />Loading…</> : '📊 Load Report'}</button>
          </div>
          {summary ? (<>
            <div className="stats-grid" style={{ marginBottom:20 }}>
              <div className="stat-card blue"><span className="stat-icon">👥</span><div className="stat-value">{summary.students.length}</div><div className="stat-label">Students</div></div>
              <div className="stat-card green"><span className="stat-icon">📈</span><div className="stat-value">{summary.averageAttendance?.toFixed(1) ?? '—'}%</div><div className="stat-label">Average</div></div>
              <div className="stat-card red"><span className="stat-icon">⚠️</span><div className="stat-value">{summary.shortfallCount}</div><div className="stat-label">Below 75%</div></div>
            </div>
            <div className="table-wrap"><table>
              <thead><tr><th>Roll</th><th>Student</th><th>Attended</th><th>Total</th><th>Attendance %</th><th>Status</th></tr></thead>
              <tbody>{summary.students.map(s => (
                <tr key={s.studentId}>
                  <td><code>{s.rollNumber}</code></td><td><strong>{s.studentName}</strong></td>
                  <td>{s.attended}</td><td>{s.total}</td>
                  <td><div style={{ minWidth:120 }}>{s.percentage.toFixed(1)}%<div className="attendance-bar"><div className={`attendance-bar-fill ${bc(s.percentage)}`} style={{ width:`${s.percentage}%` }} /></div></div></td>
                  <td><span className={`badge ${s.percentage >= 75 ? 'badge-green' : s.percentage >= 60 ? 'badge-amber' : 'badge-red'}`}>{s.percentage >= 75 ? 'OK' : s.percentage >= 60 ? 'WARNING' : 'DEFAULTER'}</span></td>
                </tr>
              ))}</tbody>
            </table></div>
          </>) : (!loading && <div className="empty-state"><span className="empty-icon">📊</span><p>Select a subject and click Load Report.</p></div>)}
        </div>
      )}

      {tab === 'overview' && (
        <div>
          {loading && <div className="alert alert-info"><span className="spinner" />Loading…</div>}
          {allSum.length === 0 && !loading && <div className="empty-state"><span className="empty-icon">📊</span><p>Loading subject summaries…</p></div>}
          {allSum.map((s, i) => (
            <div className="section-card" key={i} style={{ marginBottom:14 }}>
              <div className="section-head">
                <div><span className="eyebrow">{s.sectionName}</span><h3>{s.subjectCode} — {s.subjectName}</h3></div>
                <div style={{ display:'flex', gap:8 }}>
                  <span className="badge badge-blue">{s.students.length} students</span>
                  <span className={`badge ${(s.averageAttendance ?? 0) >= 75 ? 'badge-green' : 'badge-amber'}`}>Avg {s.averageAttendance?.toFixed(1) ?? '—'}%</span>
                  {s.shortfallCount > 0 && <span className="badge badge-red">{s.shortfallCount} defaulters</span>}
                </div>
              </div>
              <div className="attendance-bar"><div className={`attendance-bar-fill ${bc(s.averageAttendance ?? 0)}`} style={{ width:`${s.averageAttendance ?? 0}%` }} /></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── HOD PAGE ─────────────────────────────────────────────────────────────────
function HodPage({ authFetch, getCsrf }: {
  authFetch: (p: string, o?: RequestInit) => Promise<Response>;
  getCsrf: () => Promise<{ token: string }>;
}) {
  const [tab, setTab]           = useState<'disputes'|'audit'>('disputes');
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [audit, setAudit]       = useState<AuditLog[]>([]);
  const [loading, setLoading]   = useState(false);
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState('');
  const [notes, setNotes]       = useState<Record<number, string>>({});

  const loadDisputes = useCallback(async () => {
    setLoading(true); setError('');
    try { setDisputes(await authFetch('/api/disputes').then(r => r.json()).then(d => Array.isArray(d) ? d : [])); }
    catch (err) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setLoading(false); }
  }, [authFetch]);

  const loadAudit = useCallback(async () => {
    setLoading(true); setError('');
    try { setAudit(await authFetch('/api/disputes/audit').then(r => r.json()).then(d => Array.isArray(d) ? d : [])); }
    catch (err) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setLoading(false); }
  }, [authFetch]);

  useEffect(() => { loadDisputes(); }, [loadDisputes]);

  async function resolve(id: number, decision: 'APPROVED'|'REJECTED') {
    setBusy(true);
    try {
      const csrf = await getCsrf();
      await authFetch(`/api/disputes/${id}/resolve`, { method:'POST', headers:{ 'Content-Type':'application/json', 'X-XSRF-TOKEN':csrf.token }, body:JSON.stringify({ decision, note: notes[id] ?? '' }) });
      loadDisputes();
    } catch (err) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setBusy(false); }
  }

  const pending  = disputes.filter(d => d.status === 'PENDING');
  const resolved = disputes.filter(d => d.status !== 'PENDING');

  return (
    <div>
      <div className="stats-grid" style={{ marginBottom:20 }}>
        <div className="stat-card amber"><span className="stat-icon">⏳</span><div className="stat-value">{pending.length}</div><div className="stat-label">Pending</div></div>
        <div className="stat-card green"><span className="stat-icon">✅</span><div className="stat-value">{disputes.filter(d => d.status === 'APPROVED').length}</div><div className="stat-label">Approved</div></div>
        <div className="stat-card red"><span className="stat-icon">❌</span><div className="stat-value">{disputes.filter(d => d.status === 'REJECTED').length}</div><div className="stat-label">Rejected</div></div>
        <div className="stat-card purple"><span className="stat-icon">📝</span><div className="stat-value">{audit.length}</div><div className="stat-label">Audit Entries</div></div>
      </div>

      <div className="inner-tabs">
        <button className={`inner-tab ${tab === 'disputes' ? 'active' : ''}`} onClick={() => { setTab('disputes'); loadDisputes(); }}>⚖️ Disputes ({pending.length} pending)</button>
        <button className={`inner-tab ${tab === 'audit' ? 'active' : ''}`} onClick={() => { setTab('audit'); loadAudit(); }}>📝 Audit Log</button>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <div className="alert alert-info"><span className="spinner" />Loading…</div>}

      {tab === 'disputes' && (<>
        {pending.length === 0 && !loading && <div className="empty-state"><span className="empty-icon">🎉</span><p>No pending disputes!</p></div>}
        {pending.map(d => (
          <div className="dispute-card section-card" key={d.id} style={{ marginBottom:16 }}>
            <div className="dispute-header">
              <div>
                <strong style={{ fontSize:15 }}>{d.studentName ?? 'Student'}</strong>
                <span className="badge badge-gray" style={{ marginLeft:8 }}><code>{d.rollNumber}</code></span>
                <div style={{ fontSize:12, color:'var(--muted)', fontFamily:"'DM Mono',monospace", marginTop:4 }}>{d.sessionDate ? new Date(d.sessionDate).toLocaleDateString('en-IN') : '—'} · {d.subjectCode ?? '—'}</div>
              </div>
              <span className="badge badge-amber">PENDING</span>
            </div>
            <div className="dispute-body">
              <div className="dispute-reason">"{d.reason}"</div>
              <label style={{ textTransform:'none', letterSpacing:0, fontFamily:'Manrope,sans-serif', fontSize:13, fontWeight:600 }}>
                Resolution note
                <textarea rows={2} placeholder="Enter resolution details…" value={notes[d.id] ?? ''} onChange={e => setNotes({ ...notes, [d.id]: e.target.value })} style={{ resize:'vertical', marginTop:6 }} />
              </label>
              <div className="dispute-actions">
                <button className="btn-danger btn-sm" onClick={() => resolve(d.id, 'REJECTED')} disabled={busy}>❌ Reject</button>
                <button className="btn-success btn-sm" onClick={() => resolve(d.id, 'APPROVED')} disabled={busy}>✅ Approve</button>
              </div>
            </div>
          </div>
        ))}
        {resolved.length > 0 && (<>
          <div className="divider" /><h3 style={{ marginBottom:12 }}>Resolved Disputes</h3>
          <div className="table-wrap"><table>
            <thead><tr><th>Student</th><th>Date</th><th>Subject</th><th>Status</th><th>Note</th></tr></thead>
            <tbody>{resolved.map(d => (
              <tr key={d.id}>
                <td><strong>{d.studentName}</strong><br /><code style={{ fontSize:11 }}>{d.rollNumber}</code></td>
                <td><small>{d.sessionDate ? new Date(d.sessionDate).toLocaleDateString('en-IN') : '—'}</small></td>
                <td>{d.subjectCode}</td>
                <td><span className={`badge ${d.status === 'APPROVED' ? 'badge-green' : 'badge-red'}`}>{d.status}</span></td>
                <td style={{ fontSize:12, color:'var(--muted)' }}>{d.resolvedNote ?? '—'}</td>
              </tr>
            ))}</tbody>
          </table></div>
        </>)}
      </>)}

      {tab === 'audit' && (
        <div className="section-card">
          <div className="section-head"><div><span className="eyebrow">Audit Trail</span><h2>Override History</h2></div><button className="btn-secondary btn-sm" onClick={loadAudit}>↻ Refresh</button></div>
          {audit.length === 0 && !loading
            ? <div className="empty-state"><span className="empty-icon">📋</span><p>No audit entries yet.</p></div>
            : <div className="table-wrap"><table>
                <thead><tr><th>Student</th><th>Field</th><th>Old → New</th><th>By</th><th>When</th><th>Reason</th></tr></thead>
                <tbody>{audit.map(log => (
                  <tr key={log.id}>
                    <td><strong>{log.studentName}</strong><br /><code style={{ fontSize:11 }}>{log.rollNumber}</code></td>
                    <td><code>{log.fieldChanged}</code></td>
                    <td><span className="badge badge-red">{log.oldValue ?? '—'}</span> → <span className="badge badge-green">{log.newValue ?? '—'}</span></td>
                    <td>{log.changedByUsername}</td>
                    <td><small>{log.changedAt ? new Date(log.changedAt).toLocaleString('en-IN') : '—'}</small></td>
                    <td style={{ fontSize:12, color:'var(--muted)', fontStyle:'italic' }}>{log.reason ?? '—'}</td>
                  </tr>
                ))}</tbody>
              </table></div>
          }
        </div>
      )}
    </div>
  );
}

// ─── ADMIN PAGE ───────────────────────────────────────────────────────────────
function AdminPage({ authFetch, getCsrf }: {
  authFetch: (p: string, o?: RequestInit) => Promise<Response>;
  getCsrf: () => Promise<{ token: string }>;
}) {
  const [tab, setTab]         = useState<'slots'|'sessions'|'csv'>('slots');
  const [slots, setSlots]     = useState<TimetableSlot[]>([]);
  const [sessions, setSessions] = useState<TimetableSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState('');
  const [msg, setMsg]         = useState('');
  const today = new Date().toISOString().slice(0,10);
  const [from, setFrom]       = useState(today);
  const [to, setTo]           = useState(new Date(Date.now() + 30 * 86400000).toISOString().slice(0,10));
  const [csvFile, setCsvFile] = useState<File|null>(null);

  const loadSlots = useCallback(async () => {
    setLoading(true);
    try { setSlots(await authFetch('/api/timetable/slots').then(r => r.json()).then(d => Array.isArray(d) ? d : [])); }
    catch (err) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setLoading(false); }
  }, [authFetch]);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try { setSessions(await authFetch(`/api/timetable/sessions/range?from=${from}&to=${to}`).then(r => r.json()).then(d => Array.isArray(d) ? d : [])); }
    catch (err) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setLoading(false); }
  }, [authFetch, from, to]);

  useEffect(() => { loadSlots(); }, [loadSlots]);

  async function generate() {
    setBusy(true); setMsg('');
    try {
      const csrf = await getCsrf();
      const d = await authFetch('/api/timetable/sessions/generate', { method:'POST', headers:{ 'Content-Type':'application/json', 'X-XSRF-TOKEN':csrf.token }, body:JSON.stringify({ fromDate: from, toDate: to }) }).then(r => r.json());
      setMsg(`✅ Generated ${d.generated ?? ''} sessions.`); loadSessions();
    } catch (err) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setBusy(false); }
  }

  async function cancelSession(id: number) {
    setBusy(true);
    try { const csrf = await getCsrf(); await authFetch(`/api/timetable/sessions/${id}/cancel`, { method:'POST', headers:{ 'X-XSRF-TOKEN':csrf.token } }); loadSessions(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setBusy(false); }
  }

  async function importCsv(e: FormEvent) {
    e.preventDefault(); if (!csvFile) { setError('Select a CSV file.'); return; }
    setBusy(true); setMsg('');
    try {
      const csrf = await getCsrf(), form = new FormData(); form.append('file', csvFile);
      const d = await authFetch('/api/timetable/import/csv', { method:'POST', headers:{ 'X-XSRF-TOKEN':csrf.token }, body:form }).then(r => r.json());
      setMsg(`✅ Imported ${d.slotsImported ?? ''} slots.`); loadSlots();
    } catch (err) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setBusy(false); }
  }

  const byDay: Record<number, TimetableSlot[]> = {};
  slots.forEach(s => { if (!byDay[s.dayOfWeek]) byDay[s.dayOfWeek] = []; byDay[s.dayOfWeek].push(s); });

  const sc = (status: string) => status === 'SCHEDULED' ? 'badge-blue' : status === 'FINALIZED' || status === 'ATTENDED' ? 'badge-green' : status === 'CANCELLED' ? 'badge-red' : 'badge-gray';

  return (
    <div>
      {error && <div className="alert alert-danger">{error}</div>}
      {msg   && <div className="alert alert-success">{msg}</div>}
      <div className="inner-tabs">
        <button className={`inner-tab ${tab === 'slots' ? 'active' : ''}`} onClick={() => { setTab('slots'); loadSlots(); }}>🗓 Weekly Timetable</button>
        <button className={`inner-tab ${tab === 'sessions' ? 'active' : ''}`} onClick={() => { setTab('sessions'); loadSessions(); }}>📅 Sessions</button>
        <button className={`inner-tab ${tab === 'csv' ? 'active' : ''}`} onClick={() => setTab('csv')}>📥 CSV Import</button>
      </div>

      {tab === 'slots' && (<>
        {loading && <div className="alert alert-info"><span className="spinner" />Loading…</div>}
        {[1,2,3,4,5,6].map(day => byDay[day]?.length > 0 ? (
          <div className="section-card" key={day} style={{ marginBottom:14 }}>
            <h3 style={{ marginBottom:14 }}>{DAY[day]}</h3>
            <div className="table-wrap"><table>
              <thead><tr><th>Time</th><th>Subject</th><th>Section</th><th>Teacher</th><th>Room</th></tr></thead>
              <tbody>{byDay[day].sort((a,b) => a.startTime.localeCompare(b.startTime)).map(slot => (
                <tr key={slot.id}>
                  <td style={{ fontFamily:"'DM Mono',monospace", fontSize:12 }}>{slot.startTime}–{slot.endTime}</td>
                  <td><strong>{slot.subjectCode}</strong><br /><small>{slot.subjectName}</small></td>
                  <td>{slot.sectionName}</td><td>{slot.teacherUsername}</td><td>{slot.roomName}</td>
                </tr>
              ))}</tbody>
            </table></div>
          </div>
        ) : null)}
        {!loading && slots.length === 0 && <div className="empty-state"><span className="empty-icon">🗓️</span><p>No timetable slots configured. Use CSV Import to add slots.</p></div>}
      </>)}

      {tab === 'sessions' && (
        <div className="section-card">
          <div className="section-head"><div><span className="eyebrow">Session Management</span><h2>Class Sessions</h2></div></div>
          <div className="form-grid-3" style={{ marginBottom:16 }}>
            <label>From<input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
            <label>To<input type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
            <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
              <button className="btn-secondary" onClick={loadSessions} disabled={loading}>🔍 List</button>
              <button onClick={generate} disabled={busy}>⚡ Generate</button>
            </div>
          </div>
          {loading && <div className="alert alert-info"><span className="spinner" />Loading…</div>}
          {sessions.length > 0 && <div className="table-wrap"><table>
            <thead><tr><th>Date</th><th>Time</th><th>Subject</th><th>Section</th><th>Room</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>{sessions.map(s => (
              <tr key={s.id}>
                <td style={{ fontFamily:"'DM Mono',monospace", fontSize:12 }}>{s.date}</td>
                <td style={{ fontFamily:"'DM Mono',monospace", fontSize:12 }}>{s.startTime}–{s.endTime}</td>
                <td><strong>{s.subjectCode}</strong></td><td>{s.sectionName}</td><td>{s.roomName}</td>
                <td><span className={`badge ${sc(s.status)}`}>{s.status}</span></td>
                <td>{s.status === 'SCHEDULED' && <button className="btn-danger btn-sm" onClick={() => cancelSession(s.id)} disabled={busy}>Cancel</button>}</td>
              </tr>
            ))}</tbody>
          </table></div>}
          {!loading && sessions.length === 0 && <div className="empty-state"><span className="empty-icon">📅</span><p>No sessions in range. Use Generate to create from timetable slots.</p></div>}
        </div>
      )}

      {tab === 'csv' && (
        <div className="section-card">
          <div className="section-head">
            <div><span className="eyebrow">Bulk Import</span><h2>Import Timetable via CSV</h2><p style={{ fontSize:13, color:'var(--muted)', margin:'4px 0 0' }}>Columns: <code>day_of_week, start_time, end_time, subject_code, section_name, teacher_username, room_name</code></p></div>
            <a href={`${API}/api/timetable/import/template`} download="timetable-template.csv" style={{ padding:'10px 16px', background:'var(--card-2)', border:'1px solid var(--line)', borderRadius:10, textDecoration:'none', fontSize:13, fontWeight:700, color:'var(--ink)' }}>⬇ Template</a>
          </div>
          <form onSubmit={importCsv} className="form-grid">
            <label>Timetable CSV file<input type="file" accept=".csv" onChange={e => setCsvFile(e.target.files?.[0] ?? null)} /></label>
            <button type="submit" className="btn-lg" disabled={busy || !csvFile}>{busy ? <><span className="spinner" />Importing…</> : '📥 Import Timetable'}</button>
          </form>
          <div className="divider" />
          <h3 style={{ marginBottom:10 }}>Format Reference</h3>
          <div style={{ background:'var(--card-2)', border:'1px solid var(--line)', borderRadius:10, padding:'14px 18px', fontFamily:"'DM Mono',monospace", fontSize:12, overflowX:'auto' }}>
            <div style={{ color:'var(--muted)', marginBottom:8 }}># day_of_week: 1=Mon … 6=Sat</div>
            <div>day_of_week,start_time,end_time,subject_code,section_name,teacher_username,room_name</div>
            <div>1,09:00,10:00,CS101,CS-A,teacher,Room-101</div>
            <div>2,10:00,11:00,MATH201,CS-B,teacher,Room-102</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── STUDENT PAGE ─────────────────────────────────────────────────────────────
function StudentPage({ authFetch, getCsrf }: {
  authFetch: (p: string, o?: RequestInit) => Promise<Response>;
  getCsrf: () => Promise<{ token: string }>;
}) {
  const [tab, setTab]               = useState<'attendance'|'dispute'>('attendance');
  const [attendance, setAttendance] = useState<AnalyticsStudent[]>([]);
  const [disputes, setDisputes]     = useState<Dispute[]>([]);
  const [loading, setLoading]       = useState(false);
  const [busy, setBusy]             = useState(false);
  const [error, setError]           = useState('');
  const [msg, setMsg]               = useState('');
  const [sessId, setSessId]         = useState('');
  const [reason, setReason]         = useState('');

  const loadAtt = useCallback(async () => {
    setLoading(true);
    try { setAttendance(await authFetch('/api/student/my-attendance').then(r => r.json()).then(d => Array.isArray(d) ? d : [d])); }
    catch (err) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setLoading(false); }
  }, [authFetch]);

  const loadDisp = useCallback(async () => {
    setLoading(true);
    try { setDisputes(await authFetch('/api/student/my-disputes').then(r => r.json()).then(d => Array.isArray(d) ? d : [])); }
    catch (err) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setLoading(false); }
  }, [authFetch]);

  useEffect(() => { loadAtt(); }, [loadAtt]);

  async function submitDispute(e: FormEvent) {
    e.preventDefault(); if (!sessId.trim() || !reason.trim()) { setError('Session ID and reason required.'); return; }
    setBusy(true); setMsg(''); setError('');
    try {
      const csrf = await getCsrf();
      await authFetch('/api/student/dispute', { method:'POST', headers:{ 'Content-Type':'application/json', 'X-XSRF-TOKEN':csrf.token }, body:JSON.stringify({ sessionId: Number(sessId), reason }) });
      setMsg('✅ Dispute submitted. Your HOD will review it shortly.'); setSessId(''); setReason(''); loadDisp();
    } catch (err) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setBusy(false); }
  }

  const avg = attendance.length > 0 ? attendance.reduce((s, a) => s + a.percentage, 0) / attendance.length : 0;
  const bc = (p: number) => p >= 75 ? '' : p >= 60 ? 'warn' : 'danger';

  return (
    <div>
      {error && <div className="alert alert-danger">{error}</div>}
      {msg   && <div className="alert alert-success">{msg}</div>}
      {attendance.length > 0 && (
        <div className="stats-grid" style={{ marginBottom:20 }}>
          <div className="stat-card blue"><span className="stat-icon">📚</span><div className="stat-value">{attendance.length}</div><div className="stat-label">Subjects</div></div>
          <div className="stat-card green"><span className="stat-icon">✅</span><div className="stat-value">{avg.toFixed(1)}%</div><div className="stat-label">Overall Average</div></div>
          <div className="stat-card red"><span className="stat-icon">⚠️</span><div className="stat-value">{attendance.filter(a => a.percentage < 75).length}</div><div className="stat-label">Below 75%</div></div>
        </div>
      )}
      <div className="inner-tabs">
        <button className={`inner-tab ${tab === 'attendance' ? 'active' : ''}`} onClick={() => { setTab('attendance'); loadAtt(); }}>📊 My Attendance</button>
        <button className={`inner-tab ${tab === 'dispute' ? 'active' : ''}`} onClick={() => { setTab('dispute'); loadDisp(); }}>⚖️ Raise Dispute</button>
      </div>

      {tab === 'attendance' && (<>
        {loading && <div className="alert alert-info"><span className="spinner" />Loading…</div>}
        {attendance.length === 0 && !loading && <div className="empty-state"><span className="empty-icon">📋</span><p>No records yet. Attend classes to see your data here.</p></div>}
        {attendance.map((a, i) => (
          <div className="section-card" key={i} style={{ marginBottom:14 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12, flexWrap:'wrap', gap:8 }}>
              <div>
                <div style={{ fontWeight:800, fontSize:16 }}>{a.subjectName ?? 'Subject'}</div>
                <div style={{ fontSize:12, color:'var(--muted)', fontFamily:"'DM Mono',monospace" }}>{a.subjectCode} · {a.attended}/{a.total} classes</div>
              </div>
              <span className={`badge ${a.percentage >= 75 ? 'badge-green' : a.percentage >= 60 ? 'badge-amber' : 'badge-red'}`} style={{ fontSize:14, padding:'6px 14px' }}>{a.percentage.toFixed(1)}%</span>
            </div>
            <div className="attendance-bar"><div className={`attendance-bar-fill ${bc(a.percentage)}`} style={{ width:`${a.percentage}%` }} /></div>
            {a.percentage < 75 && <div style={{ fontSize:12, color:'#dc2626', marginTop:8, fontFamily:"'DM Mono',monospace" }}>
              ⚠️ Need {Math.ceil((0.75 * a.total - a.attended) / 0.25)} more class(es) to reach 75%
            </div>}
          </div>
        ))}
      </>)}

      {tab === 'dispute' && (<>
        <div className="section-card" style={{ marginBottom:20 }}>
          <span className="eyebrow">Contest Attendance</span><h2>Raise a Dispute</h2>
          <p style={{ fontSize:13, color:'var(--muted)', margin:'6px 0 20px' }}>If your attendance was incorrectly marked, submit a dispute for HOD review.</p>
          <form onSubmit={submitDispute} className="form-grid">
            <label>Session ID<input type="number" placeholder="e.g. 42" value={sessId} onChange={e => setSessId(e.target.value)} /><span className="hint">Ask your teacher for the session ID.</span></label>
            <label>Reason<textarea rows={4} placeholder="Explain why your attendance is incorrect…" value={reason} onChange={e => setReason(e.target.value)} style={{ resize:'vertical' }} /></label>
            <button type="submit" className="btn-lg" disabled={busy || !sessId.trim() || !reason.trim()}>{busy ? <><span className="spinner" />Submitting…</> : '📨 Submit Dispute'}</button>
          </form>
        </div>
        {disputes.length > 0 && (
          <div className="section-card">
            <h3 style={{ marginBottom:14 }}>My Past Disputes</h3>
            <div className="table-wrap"><table>
              <thead><tr><th>Date</th><th>Subject</th><th>Status</th><th>Reason</th><th>Resolution</th></tr></thead>
              <tbody>{disputes.map(d => (
                <tr key={d.id}>
                  <td><small>{d.sessionDate ? new Date(d.sessionDate).toLocaleDateString('en-IN') : '—'}</small></td>
                  <td>{d.subjectCode ?? '—'}</td>
                  <td><span className={`badge ${d.status === 'APPROVED' ? 'badge-green' : d.status === 'REJECTED' ? 'badge-red' : 'badge-amber'}`}>{d.status}</span></td>
                  <td style={{ fontSize:12, color:'var(--muted)' }}>{d.reason}</td>
                  <td style={{ fontSize:12, color:'var(--muted)' }}>{d.resolvedNote ?? '—'}</td>
                </tr>
              ))}</tbody>
            </table></div>
          </div>
        )}
      </>)}
    </div>
  );
}
