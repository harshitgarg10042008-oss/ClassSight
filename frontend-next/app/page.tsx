'use client';

import {
  ChangeEvent, FormEvent, PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState,
} from 'react';
import './globals.css';
import CameraCapture from '../components/CameraCapture';

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
type RecognitionDiagnostic = {
  face_index?: number; original_face_index?: number; shot_index?: number; student_id?: number | null; matched?: boolean; box?: number[];
  image_width_px?: number; image_height_px?: number; confidence_score?: number;
  recognition_state?: string; rejection_reason?: string;
};
type Review = {
  sessionId: number; status: string; records: ReviewRecord[]; allRecords?: ReviewRecord[];
  photoUrl: string; photoUrls?: string[]; quality?: { warning?: string };
  diagnostics?: RecognitionDiagnostic[]; unknownDetections?: number; unknownFacesReviewed?: boolean;
};
type SubjectOption = { id:number; code:string; name:string };
type StudentRosterItem = {
  id: number; rollNumber: string; name: string; fullName?: string; active: boolean;
  createdAt?: string; enrolledDate?: string; faceRegistered: boolean; hasFaceEmbedding?: boolean;
  embeddingCount?: number; facePhotoAvailable?: boolean; classSectionId?: number; classSectionName?: string;
  classSectionIds?: number[]; classSectionNames?: string[]; subjectIds?: number[]; sectionWideEnrollment?: boolean;
  consentGiven?: boolean;
};
type BulkEnrollResponse = {
  totalRows: number; successCount: number; failureCount: number;
  results: { rollNumber: string; name: string; success: boolean; message: string }[];
};
type QuickDetection = {
  face_count: number;
  image_width: number;
  image_height: number;
  faces: { face_index: number; box: [number, number, number, number]; quality_warnings: string[] }[];
  timings?: { total_ms?: number };
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

function friendlyError(raw: string): string {
  let value = raw.replace(/^\d{3}:\s*/, '').trim();
  for (let i = 0; i < 4; i++) {
    try {
      const parsed = JSON.parse(value);
      const nested = parsed?.message ?? parsed?.detail ?? parsed?.error;
      if (typeof nested === 'string') { value = nested; continue; }
      if (typeof nested === 'object' && nested !== null) { value = JSON.stringify(nested); continue; }
    } catch { /* Plain text error; keep its content for mapping below. */ }
    break;
  }
  const lower = value.toLowerCase();
  if (lower.includes('no face')) return 'No face found. Move closer and face the camera.';
  if (lower.includes('multiple') && lower.includes('face')) return 'More than one face found. Capture one student at a time.';
  if (lower.includes('camera') && lower.includes('busy')) return 'Camera is busy in another app or browser tab. Close it and try again.';
  if (lower.includes('class') && (lower.includes('required') || lower.includes('select'))) return 'Choose a class before continuing.';
  if (lower.includes('duplicate') || lower.includes('already exists')) return value;
  if (lower.includes('failed to fetch')) return 'Could not reach the ClassSight server. Check that the services are running.';
  return value || 'The request could not be completed. Try again.';
}

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
    if (!res.ok) { const t = await res.text(); throw new Error(friendlyError(`${res.status}: ${t}`)); }
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
          <div className="legal-links" style={{ justifyContent: 'center', marginTop: 20, fontSize: 12 }}>
            <a href="/privacy">Privacy</a><a href="/terms">Terms</a>
          </div>
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
  const [shots, setShots] = useState<{file:File;url:string}[]>([]);
  const photo = shots[0]?.file ?? null;
  const photoUrl = shots[0]?.url ?? null;
  const [mode, setMode]               = useState<'webcam' | 'file'>('webcam');
  const [sessionId, setSessionId]     = useState<number | null>(null);
  const [review, setReview]           = useState<Review | null>(null);
  const [reviewPhotoUrls, setReviewPhotoUrls] = useState<string[]>([]);
  const [ackUnknown, setAckUnknown] = useState(false);
  const [unknownAssignments, setUnknownAssignments] = useState<Record<number, number>>({});
  const [decisions, setDecisions]     = useState<Record<number, 'PRESENT' | 'ABSENT'>>({});
  const [step, setStep]               = useState<'select' | 'capture' | 'review'>('select');
  const [msg, setMsg]                 = useState('');
  const [busy, setBusy]               = useState(false);
  const [period, setPeriod]           = useState<TimetablePeriod | null>(null);

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

  async function capture() {
    if (!photo || !roomId || !assignmentId || !cameras.some(c => c.room?.id === roomId)) { setMsg('Select a configured room, subject, and take a photo.'); return; }
    setBusy(true); setMsg('Running recognition pipeline…');
    try {
      const csrf = await getCsrf();
      const form = new FormData();
      form.append('image', photo);
      shots.slice(1).forEach(shot=>form.append('additionalImages',shot.file));
      form.append('roomId', String(roomId));
      form.append('cameraId', String(cameras.find(c => c.room?.id === roomId)?.id ?? ''));
      form.append('assignmentId', String(assignmentId));
      if (period?.session?.id) form.append('classSessionId', String(period.session.id));
      const response=await authFetch('/capture', { method: 'POST', headers: { 'X-XSRF-TOKEN': csrf.token }, body: form });
      if(!response.ok)throw new Error(await friendlyError(await response.text()));
      const d = await response.json();
      setSessionId(d.sessionId); setStep('review'); setMsg(`Session #${d.sessionId} created with ${d.captureCount||shots.length} capture(s).`);
      poll(d.sessionId);
    } catch (err) { setMsg(err instanceof Error ? err.message : 'Capture failed'); }
    finally { setBusy(false); }
  }

  function poll(id: number) {
    let n = 0;
    let photoRequested = false;
    const tick = async () => {
      try {
        const d: Review = await authFetch(`/api/attendance-sessions/${id}/review`).then(r => r.json());
        setReview(d);
        if (!photoRequested && (d.photoUrls?.length || d.photoUrl)) {
          photoRequested = true;
          try { const urls=d.photoUrls?.length?d.photoUrls:[d.photoUrl];const blobs=await Promise.all(urls.map((url:string)=>authFetch(url).then(response=>{if(!response.ok)throw new Error('Photo unavailable');return response.blob();})));setReviewPhotoUrls(blobs.map(blob=>URL.createObjectURL(blob))); } catch { /* Detection details remain readable without stored images. */ }
        }
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
        body: JSON.stringify({
          decisions: review.records.filter(r => decisions[r.studentId]).map(r => ({ studentId: r.studentId, decision: decisions[r.studentId] })),
          unknownFaceAssignments: Object.entries(unknownAssignments).filter(([, studentId]) => Number(studentId) > 0).map(([faceIndex, studentId]) => ({ faceIndex:Number(faceIndex), studentId:Number(studentId) })),
          acknowledgeUnknownFaces: ackUnknown,
        }),
      }).then(r => r.json());
      setMsg(d.status === 'FINALIZED' ? `Session #${d.sessionId} finalized.` : `Session #${d.sessionId} still needs review.`);
      poll(sessionId);
    } catch (err) { setMsg(err instanceof Error ? err.message : 'Error'); }
    finally { setBusy(false); }
  }

  const all = review?.allRecords || review?.records || [];
  const present = all.filter(r => r.status === 'PRESENT').length;
  const absent  = all.filter(r => r.status === 'ABSENT').length;
  const inReview = review?.records?.length ?? 0;
  const unknownItems = review?.diagnostics?.filter(item => item.student_id == null && item.matched === false) ?? [];
  const needsUnknownAck = unknownItems.length > 0 && !review?.unknownFacesReviewed;

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

      {msg && <div className="alert alert-info" role="status" style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center'}}><span>{msg}</span><button type="button" className="btn-secondary btn-sm" aria-label="Close message" onClick={() => setMsg('')}>×</button></div>}

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
              <button className={mode === 'file' ? '' : 'btn-secondary'} onClick={() => setMode('file')}>📂 File Upload</button>
            </div>
          </div>
          <p className="hint">Capture up to three photos. The same student across shots is counted once using the highest-confidence match.</p>
          {mode === 'webcam' && <CameraCapture disabled={busy||shots.length>=3} captureLabel="Capture attendance photo" onCapture={file => { if(shots.length>=3)return;setShots(current=>[...current,{file,url:URL.createObjectURL(file)}]);setMsg(`Photo ${shots.length+1} ready.`); }} />}
          {mode === 'file' && (
            <label>Choose classroom photo(s)
              <input type="file" accept="image/*" multiple onChange={e => { const files=Array.from(e.target.files||[]).slice(0,3-shots.length);if(files.length){setShots(current=>[...current,...files.map(file=>({file,url:URL.createObjectURL(file)}))]);}e.currentTarget.value=''; }} />
            </label>
          )}
          {shots.length>0&&<div className="form-grid-2" style={{marginTop:12}}>{shots.map((shot,index)=><div key={shot.url} className="section-card"><div className="section-head"><strong>Photo {index+1}</strong><button type="button" className="btn-danger btn-sm" onClick={()=>{URL.revokeObjectURL(shot.url);setShots(current=>current.filter(item=>item!==shot));}}>Remove</button></div><img src={shot.url} alt={`Attendance capture ${index+1}`} style={{ width:'100%', borderRadius:12, border:'1px solid var(--line)', maxHeight:320, objectFit:'contain', background:'#0f1c1a' }} /><p className="hint">{(shot.file.size/1024).toFixed(0)} KB</p></div>)}</div>}
          <div style={{ display:'flex', gap:10, marginTop:20 }}>
            <button className="btn-secondary" onClick={() => setStep('select')}>← Back</button>
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
          {review?.quality?.warning && <div className="alert alert-warn">{review.quality.warning}</div>}
          {review?.status === 'FAILED' && <div className="alert alert-danger">{review.quality?.warning || 'Recognition could not run. Verify that students are enrolled in the selected class and try again.'}</div>}
          {reviewPhotoUrls.length > 0 && review?.diagnostics?.length ? <div className="section-card" style={{marginBottom:16}}>
            <h3>Captured photos and unknown faces</h3>
            <div className="form-grid-2">{reviewPhotoUrls.map((url,shotIndex)=><div key={url} style={{maxWidth:850,margin:'12px auto'}}>
              <p className="hint">Photo {shotIndex+1}</p><div style={{position:'relative'}}><img src={url} alt={`Captured attendance photo ${shotIndex+1}`} style={{display:'block',width:'100%',height:'auto'}} />
              {unknownItems.filter(item=>(item.shot_index??0)===shotIndex).map((item,index)=>{const [top,right,bottom,left]=item.box||[];const width=item.image_width_px||1,height=item.image_height_px||1;if(right==null||bottom==null||left==null)return null;return <div key={`${shotIndex}:${item.face_index??index}`} title={item.rejection_reason||'Unknown face'} style={{position:'absolute',top:`${top/height*100}%`,left:`${left/width*100}%`,width:`${(right-left)/width*100}%`,height:`${(bottom-top)/height*100}%`,border:'3px solid #ef4444',background:'rgba(239,68,68,.1)',pointerEvents:'none'}}><span style={{background:'#991b1b',color:'#fff',padding:'2px 6px',fontSize:12}}>Unknown {index+1}</span></div>;})}</div>
            </div>)}</div>
            {unknownItems.length>0&&<div className="form-grid">{unknownItems.map((item,index)=><label key={`${item.shot_index??0}:${item.face_index??index}`}>Photo {(item.shot_index??0)+1} · Unknown face {item.original_face_index??item.face_index??index+1} · {item.rejection_reason||'No class match'}
              <select value={unknownAssignments[item.face_index??index]||''} onChange={event=>{const faceId=item.face_index??index;const nextId=Number(event.target.value)||0;const previousId=unknownAssignments[faceId];if(nextId&&Object.entries(unknownAssignments).some(([other,id])=>Number(other)!==faceId&&id===nextId)){setMsg('Assign each student to at most one unknown face.');return;}setUnknownAssignments(current=>({...current,[faceId]:nextId}));setDecisions(current=>{const next={...current};if(previousId&&!Object.values(unknownAssignments).some((id,other)=>other!==faceId&&id===previousId))delete next[previousId];if(nextId)next[nextId]='PRESENT';return next;});}}><option value="">Ignore this face after review</option>{all.map(record=><option key={record.studentId} value={record.studentId}>{record.studentName} · {record.rollNumber}</option>)}</select>
            </label>)}</div>}
          </div>:null}
          {all.length > 0 && <div className="stat-grid" style={{ marginBottom:20 }}>
            <div className="stat-card blue"><div className="stat-value">{all.length}</div><div className="stat-label">Enrolled students</div></div>
            <div className="stat-card green"><div className="stat-value">{all.filter(r => r.status === 'PRESENT').length}</div><div className="stat-label">Present (recognized)</div></div>
            <div className="stat-card red"><div className="stat-value">{all.filter(r => r.status === 'ABSENT').length}</div><div className="stat-label">Absent after review</div></div>
            <div className="stat-card amber"><div className="stat-value">{inReview}</div><div className="stat-label">Needs review</div></div>
          </div>}
          {all.length > 0 ? (<>
            <div className="records-list">
              {all.map(rec => {
                const ip = decisions[rec.studentId] === 'PRESENT' || (rec.status === 'PRESENT' && !decisions[rec.studentId]);
                const ia = decisions[rec.studentId] === 'ABSENT' || (rec.status === 'ABSENT' && !decisions[rec.studentId]);
                return <div className="record-item" key={rec.recordId}>
                  <div className="record-info"><strong>{rec.studentName}<span className={`badge ${ip ? 'badge-green' : ia ? 'badge-red' : 'badge-amber'}`} style={{ marginLeft:8 }}>{decisions[rec.studentId] || rec.status}</span>{rec.recognitionState&&<span className="badge badge-gray" style={{marginLeft:4,fontSize:10}}>{rec.recognitionState}</span>}</strong><small>Roll: <code>{rec.rollNumber}</code>{rec.confidenceScore!=null&&<> · {(rec.confidenceScore*100).toFixed(1)}%</>}{rec.qualityWarning&&<> · {rec.qualityWarning}</>}</small></div>
                  <div className="record-actions"><button className={`btn-sm ${ip?'':'btn-secondary'}`} onClick={()=>setDecisions({...decisions,[rec.studentId]:'PRESENT'})}>✓ Present</button><button className={`btn-sm ${ia?'btn-danger':'btn-secondary'}`} onClick={()=>setDecisions({...decisions,[rec.studentId]:'ABSENT'})}>✗ Absent</button></div>
                </div>;
              })}
            </div>
            {review?.status === 'REVIEW_REQUIRED' ? <div style={{marginTop:20,paddingTop:16,borderTop:'1px solid var(--line)'}}>
              <p className="hint" style={{marginBottom:12}}>{inReview} student(s) await a faculty decision. Every expected student must be marked present or absent after review.</p>
              {unknownItems.length>0&&<label style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}><input type="checkbox" checked={ackUnknown} onChange={event=>setAckUnknown(event.target.checked)} /><span>I reviewed {unknownItems.length} unknown face(s); unassigned faces are intentionally ignored.</span></label>}
              <button className="btn-lg" onClick={finalize} disabled={busy||review.records.some(record=>!decisions[record.studentId])||(unknownItems.length>0&&!ackUnknown)}>{busy?<><span className="spinner"/>Finalizing…</>:'Finalize Attendance Session'}</button>
            </div>:review?.status==='FINALIZED'?<div className="alert alert-success" style={{marginTop:16}}>Attendance finalized after faculty review. ERP-ready payload is local only, not sent.</div>:null}
          </>) : review?.status === 'FAILED' ? null : <div className="empty-state"><span className="empty-icon">⏳</span><p>Recognition engine processing… polling every 1.5 s</p></div>}
          <div style={{ marginTop:20 }}>
            <button className="btn-secondary" onClick={() => { setStep('capture'); setReview(null); reviewPhotoUrls.forEach(url=>URL.revokeObjectURL(url)); setReviewPhotoUrls([]); setAckUnknown(false); setUnknownAssignments({}); setDecisions({}); shots.forEach(shot=>URL.revokeObjectURL(shot.url)); setShots([]); }}>← Take Another Photo</button>
          </div>
        </div>
      )}
    </div>
  );
}


function FaceCropPreview({ src, box, imageWidth, imageHeight }: { src:string; box:number[]; imageWidth:number; imageHeight:number }) {
  const [preview, setPreview] = useState('');
  useEffect(() => {
    let current = '';
    const image = new Image(); image.src = src;
    image.onload = () => {
      const [top,right,bottom,left] = box;
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, right-left); canvas.height = Math.max(1, bottom-top);
      const context = canvas.getContext('2d');
      if (!context) return;
      context.drawImage(image, left, top, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => { if (blob) { current = URL.createObjectURL(blob); setPreview(current); } }, 'image/jpeg', 0.9);
    };
    return () => { if (current) URL.revokeObjectURL(current); };
  }, [src, box, imageWidth, imageHeight]);
  return <span style={{display:'inline-flex',alignItems:'center',gap:8}}>{preview?<img src={preview} alt="Cropped face thumbnail" style={{width:64,height:64,objectFit:'cover',borderRadius:8}}/>:<span className="hint">Preparing face crop…</span>}</span>;
}


function StudentFaceThumbnail({ student, authFetch }: { student:StudentRosterItem; authFetch:(path:string,options?:RequestInit)=>Promise<Response> }) {
  const root = useRef<HTMLSpanElement>(null); const [imageUrl,setImageUrl]=useState('');
  useEffect(()=>{
    if(!student.facePhotoAvailable||!root.current)return;
    let disposed=false;let objectUrl='';const element=root.current;
    const load=async()=>{try{const response=await authFetch(`/students/${student.id}/photo`);if(!response.ok)throw new Error('Unavailable');const blob=await response.blob();if(!disposed){objectUrl=URL.createObjectURL(blob);setImageUrl(objectUrl);}}catch{/* initials remain as a privacy-safe fallback */}};
    if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){observer.disconnect();void load();}});observer.observe(element);return()=>{disposed=true;observer.disconnect();if(objectUrl)URL.revokeObjectURL(objectUrl);};}
    void load();return()=>{disposed=true;if(objectUrl)URL.revokeObjectURL(objectUrl);};
  },[authFetch,student.id,student.facePhotoAvailable]);
  const initials=student.name.split(/\s+/).map(part=>part[0]||'').slice(0,2).join('').toUpperCase();
  return <span ref={root} className="user-avatar" aria-label={imageUrl?`Face thumbnail for ${student.name}`:`Face thumbnail unavailable for ${student.name}`} style={{overflow:'hidden',padding:0}}>{imageUrl?<img src={imageUrl} alt={`Face thumbnail for ${student.name}`} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'inherit'}}/>:initials}</span>;
}

// ─── ENROLLMENT PAGE ──────────────────────────────────────────────────────────
function EnrollmentPage({ authFetch, getCsrf }: {
  authFetch: (p: string, o?: RequestInit) => Promise<Response>;
  getCsrf: () => Promise<{ token: string }>;
}) {
  type Shot = { id: number; file: File; url: string; image_width: number; image_height: number; faces: QuickDetection['faces'] };
  type FaceDraft = { name: string; roll: string; mergeWith?: string };
  const [tab, setTab] = useState<'quick'|'bulk'|'single'|'roster'|'test'>('quick');
  const [roster, setRoster] = useState<StudentRosterItem[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [createSubjectId, setCreateSubjectId] = useState('');
  const [assignmentId, setAssignmentId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgKind, setMsgKind] = useState<'info'|'success'|'error'>('info');
  const [quickShots, setQuickShots] = useState<Shot[]>([]);
  const [faceDrafts, setFaceDrafts] = useState<Record<string, FaceDraft>>({});
  const [quickConsent, setQuickConsent] = useState(false);
  const [quickCameraOpen, setQuickCameraOpen] = useState(false);
  const [testPhoto, setTestPhoto] = useState<File|null>(null);
  const [testPhotoUrl, setTestPhotoUrl] = useState('');
  const [testReview, setTestReview] = useState<Review|null>(null);
  const [testCameraOpen, setTestCameraOpen] = useState(false);
  const [singleName, setSingleName] = useState('');
  const [singleRoll, setSingleRoll] = useState('');
  const [singlePhoto, setSinglePhoto] = useState<File|null>(null);
  const [singlePhotoUrl, setSinglePhotoUrl] = useState('');
  const [singleCameraOpen, setSingleCameraOpen] = useState(false);
  const [bulkCsv, setBulkCsv] = useState<File|null>(null);
  const [bulkZip, setBulkZip] = useState<File|null>(null);
  const [bulkResult, setBulkResult] = useState<BulkEnrollResponse|null>(null);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [editDraft, setEditDraft] = useState<{ id: number; name: string; roll: string; classSectionId: string }|null>(null);
  const [recaptureStudent, setRecaptureStudent] = useState<StudentRosterItem|null>(null);
  const [recaptureConsent, setRecaptureConsent] = useState(false);
  const [drawShotId, setDrawShotId] = useState<number|null>(null);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number }|null>(null);
  const [createClass, setCreateClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newAcademicYear, setNewAcademicYear] = useState(String(new Date().getFullYear()));

  const notify = (text: string, kind: 'info'|'success'|'error' = 'info') => { setMsg(text); setMsgKind(kind); };
  const selectedAssignment = assignments.find(item => String(item.id) === assignmentId);
  const availableAssignments = assignments.filter(item => item.id > 0);
  const selectedTestAssignment = availableAssignments.find(item => String(item.id) === assignmentId);

  const loadRoster = useCallback(async () => {
    const response = await authFetch('/students');
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Student roster response was not a list.');
    setRoster(data.map((student: any) => ({
      ...student,
      name: student.name || student.fullName || `${student.firstName || ''} ${student.lastName || ''}`.trim(),
      faceRegistered: Boolean(student.faceRegistered ?? student.hasFaceEmbedding),
      enrolledDate: student.enrolledDate || student.createdAt,
      embeddingCount: Number(student.embeddingCount || 0),
    })));
  }, [authFetch]);

  useEffect(() => {
    void loadRoster().catch(error => notify(error instanceof Error ? error.message : 'Could not load the student roster.', 'error'));
    Promise.allSettled([
      authFetch('/teacher/assignments').then(response => response.json()),
      authFetch('/api/rooms').then(response => response.json()),
      authFetch('/api/cameras').then(response => response.json()),
      authFetch('/students/subjects').then(response => response.json()),
    ]).then(results => {
      const [as, rms, cams, subs] = results;
      if (as.status === 'fulfilled' && Array.isArray(as.value)) {
        setAssignments(as.value);
        if (as.value.length) setAssignmentId(String(as.value[0].id));
      } else notify(as.status === 'rejected' ? as.reason?.message || 'Could not load classes.' : 'Class list was invalid.', 'error');
      if (rms.status === 'fulfilled' && Array.isArray(rms.value)) {
        setRooms(rms.value); if (rms.value.length) setRoomId(String(rms.value[0].id));
      }
      if (cams.status === 'fulfilled' && Array.isArray(cams.value)) setCameras(cams.value);
      if (subs.status === 'fulfilled' && Array.isArray(subs.value)) {
        setSubjects(subs.value);
        if (subs.value.length) setCreateSubjectId(String(subs.value[0].id));
      }
    });
  }, [authFetch, loadRoster]);

  function switchTab(next: typeof tab) {
    setMsg(''); setTab(next);
    setQuickCameraOpen(false); setTestCameraOpen(false); setSingleCameraOpen(false);
  }

  async function addQuickPhoto(file: File) {
    if (quickShots.length >= 3) { notify('Capture up to 3 class photos.', 'error'); return; }
    if (!selectedAssignment) { notify('Choose or create the class and subject before capturing a class photo.', 'error'); return; }
    setBusy(true); setMsg('');
    const url = URL.createObjectURL(file);
    try {
      const csrf = await getCsrf(); const form = new FormData(); form.append('photo', file);
      const result: QuickDetection = await authFetch('/students/quick-detect', { method:'POST', headers:{ 'X-XSRF-TOKEN':csrf.token }, body:form }).then(r => r.json());
      if (!result || !Array.isArray(result.faces)) throw new Error('Face detector returned an invalid response.');
      const shot: Shot = { id: Date.now(), file, url, image_width: result.image_width, image_height: result.image_height, faces: result.faces };
      setQuickShots(current => [...current, shot]);
      setQuickCameraOpen(false);
      notify(`${result.face_count} face(s) detected in this photo. Review the boxes and enter each student's name and roll number.`, 'success');
    } catch (error) { URL.revokeObjectURL(url); notify(error instanceof Error ? error.message : 'Face detection failed.', 'error'); }
    finally { setBusy(false); }
  }

  function removeFace(shotId: number, faceIndex: number) {
    const removedKey = `${shotId}:${faceIndex}`;
    setQuickShots(current => current.map(shot => shot.id === shotId ? { ...shot, faces:shot.faces.filter(face => face.face_index !== faceIndex) } : shot));
    setFaceDrafts(current => { const next = { ...current }; delete next[removedKey]; for (const [key,draft] of Object.entries(next)) if (draft.mergeWith===removedKey) next[key]={...draft,mergeWith:undefined}; return next; });
  }

  function beginBox(event: ReactPointerEvent<HTMLDivElement>, shot: Shot) {
    if (drawShotId !== shot.id) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setDrawStart({ x: event.clientX - rect.left, y: event.clientY - rect.top });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function finishBox(event: ReactPointerEvent<HTMLDivElement>, shot: Shot) {
    if (drawShotId !== shot.id || !drawStart) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x2 = event.clientX - rect.left, y2 = event.clientY - rect.top;
    const leftPx = Math.min(drawStart.x, x2) / rect.width * shot.image_width;
    const rightPx = Math.max(drawStart.x, x2) / rect.width * shot.image_width;
    const topPx = Math.min(drawStart.y, y2) / rect.height * shot.image_height;
    const bottomPx = Math.max(drawStart.y, y2) / rect.height * shot.image_height;
    setDrawStart(null); setDrawShotId(null);
    if (rightPx - leftPx < 12 || bottomPx - topPx < 12) { notify('Draw a larger box around the missed face.', 'error'); return; }
    const faceIndex = Math.max(0, ...quickShots.flatMap(item => item.faces.map(face => face.face_index))) + 1;
    setQuickShots(current => current.map(item => item.id === shot.id ? { ...item, faces:[...item.faces, { face_index:faceIndex, box:[Math.round(topPx), Math.round(rightPx), Math.round(bottomPx), Math.round(leftPx)], quality_warnings:['Added manually by faculty'] }] } : item));
    notify('Manual face box added. Verify it contains exactly one face.');
  }

  async function enrollQuickFaces() {
    if (!selectedAssignment || !quickConsent || quickShots.length === 0) { notify('Choose the class, capture at least one photo, and confirm consent before saving.', 'error'); return; }
    const allFaces = quickShots.flatMap(shot => shot.faces.map(face => ({ key:`${shot.id}:${face.face_index}`, shot, face })));
    if (!allFaces.length) { notify('No face boxes are selected. Keep or draw at least one face.', 'error'); return; }
    const rootFor = (key:string) => { let current=key; const seen=new Set<string>(); while(faceDrafts[current]?.mergeWith&&!seen.has(current)){seen.add(current);current=faceDrafts[current].mergeWith!;} return current; };
    const grouped = new Map<string, typeof allFaces>();
    for (const item of allFaces) { const root=rootFor(item.key); if(!grouped.has(root))grouped.set(root,[]); grouped.get(root)!.push(item); }
    const groups = [...grouped.entries()].map(([root,items])=>({root,items,draft:faceDrafts[root]||{name:'',roll:''}}));
    if (groups.some(group=>!group.draft.name.trim()||!group.draft.roll.trim())) { notify('Enter a name and roll number for every student group.', 'error'); return; }
    const names=groups.map(group=>group.draft.name.trim().toLocaleLowerCase()); const rolls=groups.map(group=>group.draft.roll.trim().toLocaleLowerCase());
    if(new Set(names).size!==names.length||new Set(rolls).size!==rolls.length){notify('Duplicate names or roll numbers are not allowed. Use “Same student as…” to merge duplicate detections across photos.', 'error');return;}
    setBusy(true); setMsg(''); let enrolled=0; let extraReferences=0;
    try {
      const cropFile = async (item:typeof allFaces[number], roll:string) => {
        const image=new Image(); image.src=item.shot.url;
        await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(new Error('Could not read the class photo.'));});
        const source=document.createElement('canvas'); source.width=item.shot.image_width; source.height=item.shot.image_height;
        const sourceContext=source.getContext('2d'); if(!sourceContext)throw new Error('Could not prepare the face crop.'); sourceContext.drawImage(image,0,0,source.width,source.height);
        const [top,right,bottom,left]=item.face.box; const width=Math.max(1,Math.min(source.width-left,right-left)); const height=Math.max(1,Math.min(source.height-top,bottom-top));
        const crop=document.createElement('canvas');crop.width=width;crop.height=height;const context=crop.getContext('2d');if(!context)throw new Error('Could not crop the detected face.');
        context.drawImage(source,left,top,width,height,0,0,width,height);const blob=await new Promise<Blob|null>(resolve=>crop.toBlob(resolve,'image/jpeg',0.95));if(!blob)throw new Error('Could not encode a face crop.');
        return new File([blob],`face-${roll}-${item.shot.id}.jpg`,{type:'image/jpeg'});
      };
      for(const group of groups){
        const first=group.items[0];const name=group.draft.name.trim();const roll=group.draft.roll.trim();
        const firstPhoto=await cropFile(first,roll);const csrf=await getCsrf();const form=new FormData();
        form.append('name',name);form.append('rollNumber',roll);form.append('classSectionId',String(selectedAssignment.classSection.id));form.append('subjectId',String(selectedAssignment.subject.id));form.append('consentGiven','true');form.append('photo',firstPhoto);
        const created=await authFetch('/students/enroll-single',{method:'POST',headers:{'X-XSRF-TOKEN':csrf.token},body:form}).then(response=>response.json());
        const studentId=Number(created.student?.id);if(!studentId)throw new Error('Student enrolled but the server did not return its record ID.');enrolled++;
        for(const extra of group.items.slice(1)){
          const extraPhoto=await cropFile(extra,roll);const recaptureCsrf=await getCsrf();const recaptureForm=new FormData();
          recaptureForm.append('consentGiven','true');recaptureForm.append('subjectId',String(selectedAssignment.subject.id));recaptureForm.append('photo',extraPhoto);
          await authFetch(`/students/${studentId}/recapture`,{method:'POST',headers:{'X-XSRF-TOKEN':recaptureCsrf.token},body:recaptureForm});extraReferences++;
        }
      }
      await loadRoster();
      notify(`${enrolled} student(s) enrolled in ${selectedAssignment.classSection.name} / ${selectedAssignment.subject.name}; ${extraReferences} extra angle(s) merged as additional face references.`, 'success');
      setQuickShots([]);setFaceDrafts({});setQuickConsent(false);setQuickCameraOpen(false);
    } catch(error){if(enrolled)await loadRoster();notify(`${enrolled?`${enrolled} enrolled before an error: `:''}${error instanceof Error?error.message:'Enrollment failed.'}`,'error');}
    finally{setBusy(false);}
  }

  async function runTestRecognition() {
    setMsg(''); setTestReview(null);
    if (!roster.some(student=>student.active&&student.faceRegistered)) { notify('No enrolled students yet. Enroll students first.', 'info'); return; }
    if (!selectedTestAssignment || !testPhoto || !roomId) { notify('Select a class and room, then capture or upload a recognition photo.', 'error'); return; }
    const classHasFaces=roster.some(student=>student.active&&student.faceRegistered&&(student.classSectionIds||[student.classSectionId]).includes(selectedTestAssignment.classSection.id)&&(student.sectionWideEnrollment||student.subjectIds?.includes(selectedTestAssignment.subject.id)));
    if (!classHasFaces) { notify(`No enrolled students with face references in ${selectedTestAssignment.classSection.name} / ${selectedTestAssignment.subject.code}. Enroll students in this class first.`, 'info'); return; }
    const camera = cameras.find(item => item.room?.id === Number(roomId));
    if (!camera) { notify('No camera is registered for this room. Select a configured room or contact an administrator.', 'error'); return; }
    setBusy(true);
    try {
      const csrf = await getCsrf(); const form = new FormData();
      form.append('image', testPhoto); form.append('roomId', roomId); form.append('cameraId', String(camera.id));
      form.append('assignmentId', String(selectedTestAssignment.id)); form.append('sessionType', 'TEST');
      const response=await authFetch('/capture', { method:'POST', headers:{ 'X-XSRF-TOKEN':csrf.token }, body:form });
      if(!response.ok)throw new Error(friendlyError(await response.text()));
      const result=await response.json();let review:Review|undefined;
      for(let attempt=0;attempt<40;attempt++){
        const reviewResponse=await authFetch(`/api/attendance-sessions/${result.sessionId}/review`);
        if(!reviewResponse.ok)throw new Error(friendlyError(await reviewResponse.text()));
        const currentReview:Review=await reviewResponse.json();review=currentReview;setTestReview(currentReview);
        if(!['CAPTURED','PROCESSING'].includes(currentReview.status))break;
        await new Promise(resolve=>setTimeout(resolve,1500));
      }
      if(review)setTestReview(review);
      notify(`Test session #${result.sessionId} completed (${review?.status||'processing'}). This session does not affect attendance analytics.`, 'success');
    } catch (error) { notify(error instanceof Error ? error.message : 'Test recognition failed.', 'error'); }
    finally { setBusy(false); }
  }

  async function clearTestRecognition() {
    if (!testReview) return;
    setBusy(true);
    try { await authFetch(`/api/attendance-sessions/${testReview.sessionId}`, { method:'DELETE' }); setTestReview(null); notify('Test recognition session cleared.', 'success'); }
    catch (error) { notify(error instanceof Error ? error.message : 'Could not clear the test session.', 'error'); }
    finally { setBusy(false); }
  }

  async function enrollSingle(event: FormEvent) {
    event.preventDefault();
    if (!selectedAssignment || !singlePhoto || !singleName.trim() || !singleRoll.trim()) { notify("Choose a class and provide the student name, roll number, and photo.", 'error'); return; }
    setBusy(true);
    try {
      const csrf = await getCsrf(); const form = new FormData();
      form.append('name', singleName.trim()); form.append('rollNumber', singleRoll.trim());
      form.append('classSectionId', String(selectedAssignment.classSection.id)); form.append('subjectId', String(selectedAssignment.subject.id));
      form.append('consentGiven', 'true'); form.append('photo', singlePhoto);
      await authFetch('/students/enroll-single', { method:'POST', headers:{ 'X-XSRF-TOKEN':csrf.token }, body:form });
      await loadRoster(); notify(`${singleName.trim()} (${singleRoll.trim()}) enrolled in ${selectedAssignment.classSection.name} / ${selectedAssignment.subject.name}.`, 'success');
      setSingleName(''); setSingleRoll(''); setSinglePhoto(null); setSinglePhotoUrl(''); setSingleCameraOpen(false);
    } catch (error) { notify(error instanceof Error ? error.message : 'Student enrollment failed.', 'error'); }
    finally { setBusy(false); }
  }

  async function enrollBulk(event: FormEvent) {
    event.preventDefault();
    if (!bulkCsv || !selectedAssignment || (!bulkZip)) { notify('Choose a class, CSV file, and ZIP of student photos.', 'error'); return; }
    setBusy(true);
    try {
      const csrf = await getCsrf(); const form = new FormData(); form.append('csvFile', bulkCsv); form.append('zipFile', bulkZip);
      form.append('classSectionId', String(selectedAssignment.classSection.id)); form.append('subjectId',String(selectedAssignment.subject.id)); form.append('consentGiven','true');
      const result: BulkEnrollResponse = await authFetch('/students/bulk-enroll', { method:'POST', headers:{ 'X-XSRF-TOKEN':csrf.token }, body:form }).then(r => r.json());
      setBulkResult(result); await loadRoster(); notify(`${result.successCount} enrolled, ${result.failureCount} failed.`, result.failureCount ? 'info' : 'success');
    } catch (error) { notify(error instanceof Error ? error.message : 'Bulk enrollment failed.', 'error'); }
    finally { setBusy(false); }
  }

  async function createClassSection(event: FormEvent) {
    event.preventDefault();
    const createSubject=subjects.find(subject=>String(subject.id)===createSubjectId);
    if (!createSubject || !newClassName.trim() || !roomId) { notify('Select a subject and room and enter a class/section name.', 'error'); return; }
    setBusy(true);
    try {
      const csrf = await getCsrf();
      const section = await authFetch('/students/classes', { method:'POST', headers:{ 'Content-Type':'application/json', 'X-XSRF-TOKEN':csrf.token }, body:JSON.stringify({ name:newClassName.trim(), subjectId:createSubject.id, roomId:Number(roomId), academicYear:Number(newAcademicYear) }) }).then(r => r.json());
      const localAssignment: Assignment = { id:Number(section.assignmentId), subject:{id:createSubject.id,code:createSubject.code,name:createSubject.name}, classSection:{ id:Number(section.id), name:section.name, academicYear:Number(section.academicYear || newAcademicYear) }, active:true };
      setAssignments(current => [...current.filter(item => item.classSection.id !== localAssignment.classSection.id), localAssignment]);
      setAssignmentId(String(localAssignment.id)); setNewClassName(''); setCreateClass(false);
      notify(`Class section ${section.name} created for enrollment. The class and subject are now available for attendance.`, 'success');
    } catch (error) { notify(error instanceof Error ? error.message : 'Could not create the class section.', 'error'); }
    finally { setBusy(false); }
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault(); if (!editDraft) return;
    setBusy(true);
    try {
      const csrf = await getCsrf();
      await authFetch(`/students/${editDraft.id}`, { method:'PUT', headers:{ 'Content-Type':'application/json', 'X-XSRF-TOKEN':csrf.token }, body:JSON.stringify({ name:editDraft.name, rollNumber:editDraft.roll, classSectionId:Number(editDraft.classSectionId) }) });
      setEditDraft(null); await loadRoster(); notify('Student details updated.', 'success');
    } catch (error) { notify(error instanceof Error ? error.message : 'Could not update student.', 'error'); }
    finally { setBusy(false); }
  }

  async function deleteStudent(student: StudentRosterItem) {
    if (!window.confirm(`Delete ${student.name} (${student.rollNumber}) and remove their biometric references?`)) return;
    setBusy(true);
    try { const csrf = await getCsrf(); await authFetch(`/students/${student.id}`, { method:'DELETE', headers:{ 'X-XSRF-TOKEN':csrf.token } }); await loadRoster(); notify(`${student.name} was removed from the active roster.`, 'success'); }
    catch (error) { notify(error instanceof Error ? error.message : 'Could not delete student.', 'error'); }
    finally { setBusy(false); }
  }

  async function recapture(file: File) {
    if (!recaptureStudent) return;
    const memberships=recaptureStudent.classSectionIds||[recaptureStudent.classSectionId];
    const assignment = assignments.find(item => memberships.includes(item.classSection.id) && item.id > 0);
    if (!assignment) { notify('No active subject assignment matches this student\'s class.', 'error'); return; }
    setBusy(true);
    try {
      const csrf = await getCsrf(); const form = new FormData(); form.append('consentGiven','true'); form.append('subjectId',String(assignment.subject.id)); form.append('photo',file);
      await authFetch(`/students/${recaptureStudent.id}/recapture`, { method:'POST', headers:{ 'X-XSRF-TOKEN':csrf.token }, body:form });
      setRecaptureStudent(null); setRecaptureConsent(false); await loadRoster(); notify(`New face reference added for ${recaptureStudent.name}.`, 'success');
    } catch (error) { notify(error instanceof Error ? error.message : 'Could not recapture the face.', 'error'); }
    finally { setBusy(false); }
  }

  const visibleRoster = roster.filter(student => {
    const classNames=student.classSectionNames?.join(' ')||student.classSectionName||'';
    const matchesSearch = `${student.name} ${student.rollNumber} ${classNames}`.toLowerCase().includes(search.toLowerCase());
    const classIds=student.classSectionIds||[student.classSectionId];
    return student.active && matchesSearch && (!classFilter || classIds.includes(Number(classFilter)));
  });
  const alertClass = msgKind === 'success' ? 'alert alert-success' : msgKind === 'error' ? 'alert alert-danger' : 'alert alert-info';

  return <div>
    {msg && <div className={alertClass} role="status" style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center'}}><span>{msg}</span><button className="btn-secondary btn-sm" aria-label="Close message" onClick={() => setMsg('')}>×</button></div>}
    <div className="inner-tabs">
      {(['bulk','single','roster','quick','test'] as const).map(item => <button key={item} className={`inner-tab ${tab===item?'active':''}`} onClick={() => switchTab(item)}>{item==='bulk'?'Bulk Import':item==='single'?'Single Student':item==='roster'?`Roster (${roster.filter(s=>s.active).length})`:item==='quick'?'Quick Class Enrollment':'Test Recognition'}</button>)}
    </div>

    {tab==='quick' && <div className="section-card">
      <span className="eyebrow">Class-based live enrollment</span><h2>Quick Class Enrollment</h2>
      <p className="hint">Choose the class before capture. Capture up to three photos, review every detected face, and enter real names and roll numbers. Capture up to three photos; explicitly merge repeated detections of the same student to add each angle as a reference. Faculty reviews each merge before saving.</p>
      <div className="form-grid-2">
        <label>Room<select value={roomId} onChange={event=>setRoomId(event.target.value)}><option value="">Select room</option>{rooms.map(room=><option key={room.id} value={room.id}>{room.name}</option>)}</select></label>
        <label>Class / Subject / Section<select value={assignmentId} onChange={event=>setAssignmentId(event.target.value)}><option value="">Select class</option>{assignments.map(item=><option key={item.id} value={item.id}>{rooms.find(r=>String(r.id)===roomId)?.name || 'Room'} · {item.subject.code} — {item.subject.name} · {item.classSection.name}</option>)}</select></label>
      </div>
      <div style={{marginTop:10}}><button className="btn-secondary btn-sm" type="button" onClick={()=>setCreateClass(value=>!value)}>+ Create class section</button></div>
      {createClass && <form onSubmit={createClassSection} className="form-grid" style={{marginTop:12}}><div className="form-grid-2"><label>Subject<select value={createSubjectId} onChange={event=>setCreateSubjectId(event.target.value)} required><option value="">Select subject</option>{subjects.map(subject=><option key={subject.id} value={subject.id}>{subject.code} — {subject.name}</option>)}</select></label><label>Class / Section name<input value={newClassName} onChange={e=>setNewClassName(e.target.value)} required placeholder="e.g. CSE-A" /></label><label>Academic year<input type="number" value={newAcademicYear} onChange={e=>setNewAcademicYear(e.target.value)} required /></label></div><button type="submit" disabled={busy || !subjects.length || !roomId}>Create class section</button></form>}
      {selectedAssignment && <p className="hint" style={{marginTop:10}}>Selected: {rooms.find(r=>String(r.id)===roomId)?.name || 'No room selected'} / {selectedAssignment.subject.name} / {selectedAssignment.classSection.name}</p>}
      {!selectedAssignment && <div className="alert alert-warn">Select a class and subject before enrolling. If no class is listed, use Create class section.</div>}
      {selectedAssignment && <>
        {quickCameraOpen && <CameraCapture disabled={busy || quickShots.length>=3} captureLabel="Capture class photo" onCapture={file=>void addQuickPhoto(file)} />}
        <div style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:14}}><button type="button" disabled={!selectedAssignment || quickShots.length>=3 || busy} onClick={()=>setQuickCameraOpen(value=>!value)}>{quickCameraOpen?'Close camera':'Open live camera'}</button><label className="btn-secondary" style={{cursor:'pointer'}}>Upload photo instead<input type="file" accept="image/*" disabled={quickShots.length>=3 || busy} style={{display:'none'}} onChange={event=>{const file=event.target.files?.[0];if(file)void addQuickPhoto(file);event.currentTarget.value='';}} /></label><span className="hint">{quickShots.length}/3 photos</span></div>
      </>}
      {quickShots.map((shot, shotIndex)=><div key={shot.id} className="section-card" style={{marginTop:18}}><div className="section-head"><h3>Photo {shotIndex+1}</h3><button type="button" className="btn-danger btn-sm" onClick={()=>{URL.revokeObjectURL(shot.url);setQuickShots(current=>current.filter(item=>item.id!==shot.id));setFaceDrafts(current=>{const next={...current};for(const face of shot.faces)delete next[`${shot.id}:${face.face_index}`];for(const [key,draft] of Object.entries(next))if(draft.mergeWith?.startsWith(`${shot.id}:`))next[key]={...draft,mergeWith:undefined};return next;});}}>Remove photo</button></div>
        <div style={{position:'relative',maxWidth:850,margin:'12px auto'}} onPointerDown={event=>beginBox(event,shot)} onPointerUp={event=>finishBox(event,shot)}>
          <img src={shot.url} alt={`Class photo ${shotIndex+1}`} style={{display:'block',width:'100%',height:'auto'}} />
          {shot.faces.map(face=>{const [top,right,bottom,left]=face.box;return <button type="button" title="Click to discard this detection" key={face.face_index} onClick={()=>removeFace(shot.id,face.face_index)} style={{position:'absolute',top:`${top/shot.image_height*100}%`,left:`${left/shot.image_width*100}%`,width:`${(right-left)/shot.image_width*100}%`,height:`${(bottom-top)/shot.image_height*100}%`,border:'2px solid #22c55e',background:'rgba(34,197,94,.14)',color:'#fff',textShadow:'0 1px 3px #000',fontWeight:800,cursor:'pointer'}}>{face.face_index+1} ×</button>;})}
          {drawShotId===shot.id && <div style={{position:'absolute',inset:0,cursor:'crosshair',touchAction:'none',border:'2px dashed #2563eb'}} />}
        </div>
        <p className="hint">{shot.faces.length} face(s) kept. Click any green box to discard it. {drawShotId===shot.id?'Drag around a missed face to add a box.':''}</p>
        <button type="button" className="btn-secondary btn-sm" onClick={()=>{setDrawShotId(drawShotId===shot.id?null:shot.id);setDrawStart(null);}}>＋ Draw missed face</button>
        {shot.faces.map(face=>{const key=`${shot.id}:${face.face_index}`;const draft=faceDrafts[key]||{name:'',roll:''};return <div key={key} className="form-grid-2" style={{marginTop:10,borderTop:'1px solid var(--line)',paddingTop:10}}><div><span className="hint">Face {face.face_index+1} crop</span><FaceCropPreview src={shot.url} box={face.box} imageWidth={shot.image_width} imageHeight={shot.image_height}/></div><label>Same student as<select value={draft.mergeWith||''} onChange={event=>setFaceDrafts(current=>({...current,[key]:{...draft,mergeWith:event.target.value||undefined}}))}><option value="">New student</option>{quickShots.flatMap(otherShot=>otherShot.faces.map(otherFace=>({key:`${otherShot.id}:${otherFace.face_index}`,label:`Photo ${quickShots.findIndex(item=>item.id===otherShot.id)+1} · Face ${otherFace.face_index+1}`,draft:faceDrafts[`${otherShot.id}:${otherFace.face_index}`]}))).filter(other=>other.key!==key&&!other.draft?.mergeWith).map(other=><option key={other.key} value={other.key}>{other.label}</option>)}</select></label>{draft.mergeWith?<div className="hint" style={{alignSelf:'center'}}>Merged into {faceDrafts[draft.mergeWith]?.name||'student'}; this crop becomes an extra biometric reference.</div>:<><label>Name<input value={draft.name} onChange={event=>setFaceDrafts(current=>({...current,[key]:{...draft,name:event.target.value}}))} placeholder="Student name" /></label><label>Roll number<input value={draft.roll} onChange={event=>setFaceDrafts(current=>({...current,[key]:{...draft,roll:event.target.value}}))} placeholder="Roll number" /></label></>}{face.quality_warnings.length>0&&<span className="hint">Review warning: {face.quality_warnings.join(', ')}</span>}</div>;})}
      </div>)}
      <label style={{display:'flex',alignItems:'center',gap:8,marginTop:18}}><input type="checkbox" checked={quickConsent} onChange={event=>setQuickConsent(event.target.checked)} required /> <span>Everyone in this photo has agreed to biometric enrollment.</span></label>
      <button type="button" className="btn-lg" disabled={busy || !selectedAssignment || !quickConsent || !quickShots.some(shot=>shot.faces.length)} onClick={()=>void enrollQuickFaces()} style={{marginTop:14}}>{busy?'Saving…':'Confirm and enroll students'}</button>
    </div>}

    {tab==='test' && <div className="section-card"><span className="eyebrow">Isolated TEST session</span><h2>Test Recognition</h2><p className="hint">Recognition runs against the selected class only. TEST sessions do not affect attendance analytics.</p>
      {!roster.some(student=>student.active&&student.faceRegistered)&&<div className="alert alert-info">No enrolled students yet. Enroll students first.</div>}
      <div className="form-grid-2"><label>Room<select value={roomId} onChange={event=>setRoomId(event.target.value)}><option value="">Select room</option>{rooms.map(room=><option key={room.id} value={room.id}>{room.name}</option>)}</select></label><label>Class / Subject<select value={assignmentId} onChange={event=>setAssignmentId(event.target.value)}><option value="">Select class</option>{availableAssignments.map(item=><option key={item.id} value={item.id}>{item.subject.code} · {item.classSection.name}</option>)}</select></label></div>
      {testCameraOpen&&<CameraCapture disabled={busy} onCapture={file=>{setTestPhoto(file);setTestPhotoUrl(URL.createObjectURL(file));setTestCameraOpen(false);}} />}
      <div style={{display:'flex',gap:8,marginTop:12,flexWrap:'wrap'}}><button type="button" onClick={()=>setTestCameraOpen(value=>!value)}>{testCameraOpen?'Close camera':'Capture with camera'}</button><label className="btn-secondary" style={{cursor:'pointer'}}>Upload photo<input type="file" accept="image/*" style={{display:'none'}} onChange={event=>{const file=event.target.files?.[0];if(file){setTestPhoto(file);setTestPhotoUrl(URL.createObjectURL(file));setTestReview(null);setMsg('');}}} /></label></div>
      {testPhotoUrl&&<img src={testPhotoUrl} alt="Test recognition capture" style={{display:'block',maxWidth:600,width:'100%',marginTop:12,borderRadius:12}} />}
      <button type="button" className="btn-lg" disabled={busy||!testPhoto||!availableAssignments.length||!roster.some(student=>student.active&&student.faceRegistered)} onClick={()=>void runTestRecognition()} style={{marginTop:12}}>{busy?'Testing…':'Run Test Recognition'}</button>
      {testReview&&<><div className="metric-row" style={{marginTop:16}}><span className="badge badge-green">{testReview.diagnostics?.filter(item=>item.recognition_state==='RECOGNIZED').length??0} Recognised</span><span className="badge badge-amber">{testReview.diagnostics?.filter(item=>item.recognition_state==='LOW_CONFIDENCE').length??0} Low confidence</span><span className="badge badge-red">{testReview.diagnostics?.filter(item=>item.recognition_state==='UNKNOWN').length??0} Unknown</span><span className="badge badge-red">{testReview.allRecords?.filter(item=>item.status==='ABSENT').length??0} Absent</span></div><div className="student-grid">{(testReview.allRecords??[]).map(record=><div className="student-card" key={record.recordId}><strong>{record.studentName}</strong><div className="hint">{record.rollNumber}</div><span className={`status-pill ${record.status==='PRESENT'?'status-green':'status-red'}`}>{record.status}</span></div>)}</div><button type="button" className="btn-secondary" onClick={()=>void clearTestRecognition()} disabled={busy}>Clear TEST session</button></>}
    </div>}

    {tab==='single'&&<div className="section-card"><span className="eyebrow">Manual enrollment</span><h2>Add single student</h2><form onSubmit={enrollSingle} className="form-grid"><div className="form-grid-2"><label>Class / Subject / Section<select required value={assignmentId} onChange={event=>setAssignmentId(event.target.value)}><option value="">Select class</option>{assignments.map(item=><option key={item.id} value={item.id}>{item.subject.code} · {item.classSection.name}</option>)}</select></label><label>Name<input value={singleName} onChange={event=>setSingleName(event.target.value)} required /></label><label>Roll number<input value={singleRoll} onChange={event=>setSingleRoll(event.target.value)} required /></label></div>
      {singleCameraOpen&&<CameraCapture disabled={busy} captureLabel="Capture student face" onCapture={file=>{setSinglePhoto(file);setSinglePhotoUrl(URL.createObjectURL(file));setSingleCameraOpen(false);}} />}
      <div style={{display:'flex',gap:8}}><button type="button" className="btn-secondary" onClick={()=>setSingleCameraOpen(value=>!value)}>{singleCameraOpen?'Close camera':'Open camera'}</button><label className="btn-secondary" style={{cursor:'pointer'}}>Upload photo<input type="file" accept="image/*" style={{display:'none'}} onChange={event=>{const file=event.target.files?.[0];if(file){setSinglePhoto(file);setSinglePhotoUrl(URL.createObjectURL(file));}}} /></label></div>
      {singlePhotoUrl&&<img src={singlePhotoUrl} alt="Student face preview" style={{maxWidth:420,width:'100%',borderRadius:12}} />}<label style={{display:'flex',alignItems:'center',gap:8}}><input type="checkbox" required /> <span>The student has given consent for biometric enrollment.</span></label><button type="submit" className="btn-lg" disabled={busy||!singlePhoto||!selectedAssignment}>Enroll student</button></form></div>}

    {tab==='bulk'&&<div className="section-card"><span className="eyebrow">Bulk onboarding</span><h2>Import a class from CSV and ZIP</h2><p className="hint">CSV columns: roll_number,name. Photo filenames should match roll numbers. Class selection is mandatory.</p><form onSubmit={enrollBulk} className="form-grid"><label>Class / Subject / Section<select value={assignmentId} onChange={event=>setAssignmentId(event.target.value)} required><option value="">Select class</option>{assignments.map(item=><option key={item.id} value={item.id}>{item.subject.code} · {item.classSection.name}</option>)}</select></label><div className="form-grid-2"><label>CSV file<input type="file" accept=".csv" onChange={event=>setBulkCsv(event.target.files?.[0]??null)} required /></label><label>Photos ZIP<input type="file" accept=".zip" onChange={event=>setBulkZip(event.target.files?.[0]??null)} required /></label></div><label style={{display:'flex',alignItems:'center',gap:8}}><input type="checkbox" required /> <span>Students have consented to biometric enrollment.</span></label><button type="submit" disabled={busy||!selectedAssignment}>{busy?'Importing…':'Start import'}</button></form>{bulkResult&&<p className="hint">{bulkResult.successCount} enrolled, {bulkResult.failureCount} failed.</p>}</div>}

    {tab==='roster'&&<div className="section-card"><div className="section-head"><div><span className="eyebrow">Student directory</span><h2>Roster ({visibleRoster.length})</h2></div><button className="btn-secondary btn-sm" onClick={()=>void loadRoster()}>Refresh</button></div><div className="form-grid-2" style={{marginBottom:16}}><label>Search by name or roll<input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search roster" /></label><label>Class filter<select value={classFilter} onChange={event=>setClassFilter(event.target.value)}><option value="">All classes</option>{assignments.map(item=><option key={item.id} value={item.classSection.id}>{item.classSection.name} · {item.subject.code}</option>)}</select></label></div>
      {recaptureStudent&&<div className="section-card" style={{marginBottom:16}}><div className="section-head"><h3>Re-capture face · {recaptureStudent.name}</h3><button className="btn-secondary btn-sm" onClick={()=>{setRecaptureStudent(null);setRecaptureConsent(false);}}>Close</button></div><label style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}><input type="checkbox" checked={recaptureConsent} onChange={event=>setRecaptureConsent(event.target.checked)}/><span>The student consents to adding this biometric reference.</span></label><CameraCapture disabled={busy||!recaptureConsent} captureLabel="Save new face photo" onCapture={file=>void recapture(file)} /></div>}
      {editDraft&&<form onSubmit={saveEdit} className="section-card form-grid" style={{marginBottom:16}}><h3>Edit student</h3><div className="form-grid-2"><label>Name<input value={editDraft.name} onChange={event=>setEditDraft({...editDraft,name:event.target.value})} required /></label><label>Roll number<input value={editDraft.roll} onChange={event=>setEditDraft({...editDraft,roll:event.target.value})} required /></label><label>Class section<select value={editDraft.classSectionId} onChange={event=>setEditDraft({...editDraft,classSectionId:event.target.value})} required>{assignments.map(item=><option key={item.id} value={item.classSection.id}>{item.classSection.name}</option>)}</select></label></div><div style={{display:'flex',gap:8}}><button type="submit" disabled={busy}>Save changes</button><button type="button" className="btn-secondary" onClick={()=>setEditDraft(null)}>Cancel</button></div></form>}
      {visibleRoster.length===0?<div className="empty-state"><span className="empty-icon">No students</span><p>No students match this filter.</p></div>:<div className="table-wrap"><table><thead><tr><th>Face thumbnail</th><th>Name</th><th>Roll number</th><th>Class(es)</th><th>Face photos</th><th>Status / quality</th><th>Enrolled date</th><th>Actions</th></tr></thead><tbody>{visibleRoster.map(student=>{const count=student.embeddingCount||0;const state=student.faceRegistered?'Enrolled':!student.consentGiven?'Incomplete':'No face';const assignment=assignments.find(item=>(student.classSectionIds||[student.classSectionId]).includes(item.classSection.id));const classes=(student.classSectionNames?.length?student.classSectionNames:[student.classSectionName||assignment?.classSection.name||'—']).join(', ');return <tr key={student.id}><td><StudentFaceThumbnail student={student} authFetch={authFetch}/></td><td><strong>{student.name||'Name missing'}</strong></td><td><code>{student.rollNumber}</code></td><td>{classes}{assignment&&<small style={{display:'block'}}>{assignment.subject.code}</small>}</td><td>{count}</td><td><span className={`badge ${student.faceRegistered?'badge-green':state==='Incomplete'?'badge-amber':'badge-red'}`}>{state}</span>{count===1&&<small style={{display:'block'}}>Demo (single photo)</small>}</td><td>{student.enrolledDate?new Date(student.enrolledDate).toLocaleDateString():'—'}</td><td><div style={{display:'flex',gap:6,flexWrap:'wrap'}}><button type="button" className="btn-secondary btn-sm" onClick={()=>setRecaptureStudent(student)}>Re-capture face</button><button type="button" className="btn-secondary btn-sm" onClick={()=>setEditDraft({id:student.id,name:student.name||'',roll:student.rollNumber,classSectionId:String(student.classSectionId||'')})}>Edit</button><button type="button" className="btn-danger btn-sm" disabled={busy} onClick={()=>void deleteStudent(student)}>Delete</button></div></td></tr>;})}</tbody></table></div>}
    </div>}
  </div>;
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
