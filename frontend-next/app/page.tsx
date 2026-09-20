'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import './globals.css';

type Room = { id: number; name: string; building?: string; floor?: number; capacity?: number; active: boolean };
type Camera = { id: number; name: string; status: string; room?: { id: number } };
type Assignment = { id: number; subject: { id: number; code: string; name: string }; classSection: { id: number; name: string; academicYear: number }; active: boolean };
type ReviewRecord = { recordId: number; studentId: number; studentName: string; rollNumber: string; status: string; recognitionState?: 'RECOGNIZED' | 'UNKNOWN' | 'LOW_CONFIDENCE' | 'RECAPTURE_REQUIRED' | string; confidenceScore?: number; qualityWarning?: string };
type Review = { sessionId: number; status: string; records: ReviewRecord[]; allRecords?: ReviewRecord[]; capturedPhotoPath?: string; photoUrl: string; quality?: { qualityPassed?: boolean; warning?: string; blurScore?: number; brightnessMean?: number } };
type StudentRosterItem = { id: number; rollNumber: string; name: string; active: boolean; consentGiven: boolean; createdAt: string; embeddingCount: number; faceRegistered: boolean };
type BulkEnrollResult = { rollNumber: string; name: string; success: boolean; message: string };
type BulkEnrollResponse = { totalRows: number; successCount: number; failureCount: number; results: BulkEnrollResult[] };

const API = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8080';

export default function FacultyFlow() {
  const [token, setToken] = useState('');
  const [userFullName, setUserFullName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [usernameOrEmail, setUsernameOrEmail] = useState('teacher');
  const [password, setPassword] = useState('teacher123');

  // Navigation mode
  const [activeTab, setActiveTab] = useState<'attendance' | 'enrollment'>('attendance');

  // Attendance state
  const [rooms, setRooms] = useState<Room[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [roomId, setRoomId] = useState<number | null>(null);
  const [assignmentId, setAssignmentId] = useState<number | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [captureMode, setCaptureMode] = useState<'webcam' | 'file'>('webcam');
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [decisions, setDecisions] = useState<Record<number, 'PRESENT' | 'ABSENT'>>({});
  const [step, setStep] = useState<'login' | 'select' | 'capture' | 'review'>('login');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  // Webcam state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');

  // Single student enrollment webcam
  const enrollVideoRef = useRef<HTMLVideoElement | null>(null);
  const enrollCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const enrollStreamRef = useRef<MediaStream | null>(null);
  const [enrollCameraActive, setEnrollCameraActive] = useState(false);
  const [singlePhoto, setSinglePhoto] = useState<File | null>(null);
  const [singlePhotoPreview, setSinglePhotoPreview] = useState<string | null>(null);
  const [singleName, setSingleName] = useState('');
  const [singleRollNumber, setSingleRollNumber] = useState('');

  // Bulk enrollment state
  const [bulkCsvFile, setBulkCsvFile] = useState<File | null>(null);
  const [bulkZipFile, setBulkZipFile] = useState<File | null>(null);
  const [bulkPhotoFiles, setBulkPhotoFiles] = useState<FileList | null>(null);
  const [bulkResults, setBulkResults] = useState<BulkEnrollResponse | null>(null);

  // Student roster
  const [roster, setRoster] = useState<StudentRosterItem[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);

  async function api(path: string, options: RequestInit = {}) {
    const headers = new Headers(options.headers);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(`${API}${path}`, { ...options, headers });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`${response.status}: ${errText}`);
    }
    return response;
  }

  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrEmail, password }),
      });
      if (!response.ok) throw new Error(`Login rejected (${response.status})`);
      const data = await response.json();
      setToken(data.token);
      setUserFullName(data.fullName || data.username);
      setUserRole(data.role);
      setStep('select');
      setMessage(`Signed in as ${data.fullName || data.username} (${data.role}).`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    stopWebcam();
    stopEnrollWebcam();
    setToken('');
    setUserFullName('');
    setUserRole('');
    setStep('login');
    setMessage('Logged out.');
  }

  // Load faculty options when token is ready
  useEffect(() => {
    if (!token) return;
    Promise.all([
      api('/api/rooms').then((r) => r.json()),
      api('/api/cameras').then((r) => r.json()),
      api('/teacher/assignments').then((r) => r.json()),
    ])
      .then(([roomData, cameraData, assignmentData]) => {
        setRooms(roomData);
        setCameras(cameraData);
        setAssignments(assignmentData);
        setRoomId(roomData[0]?.id ?? null);
        setAssignmentId(assignmentData[0]?.id ?? null);
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Could not load faculty options'));

    loadRoster();
  }, [token]);

  async function loadRoster() {
    if (!token) return;
    setLoadingRoster(true);
    try {
      const res = await api('/students');
      const data = await res.json();
      setRoster(data);
    } catch (err) {
      console.error('Failed to load roster:', err);
    } finally {
      setLoadingRoster(false);
    }
  }

  const selectedCamera = useMemo(() => {
    return cameras.find((camera) => camera.room?.id === roomId) || cameras[0];
  }, [cameras, roomId]);

  // Webcam handling for attendance
  async function startWebcam() {
    setCameraError('');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Webcam not supported in this browser environment. Use file upload fallback.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, facingMode: 'user' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      console.error('Webcam start error:', err);
      const msg = err instanceof Error ? err.message : 'Could not access webcam';
      setCameraError(`Camera error: ${msg}. Please allow camera permissions or switch to File Upload.`);
      setCameraActive(false);
    }
  }

  function stopWebcam() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }

  function snapWebcamPhoto() {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `attendance-webcam-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setPhoto(file);
        setPhotoPreviewUrl(URL.createObjectURL(blob));
        setMessage('Webcam photo snapped! Ready to capture and recognize.');
      },
      'image/jpeg',
      0.95
    );
  }

  // Webcam handling for single student enrollment
  async function startEnrollWebcam() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      });
      enrollStreamRef.current = stream;
      if (enrollVideoRef.current) {
        enrollVideoRef.current.srcObject = stream;
        await enrollVideoRef.current.play();
      }
      setEnrollCameraActive(true);
    } catch (err) {
      setMessage(`Webcam error: ${err instanceof Error ? err.message : 'Could not access camera'}`);
    }
  }

  function stopEnrollWebcam() {
    if (enrollStreamRef.current) {
      enrollStreamRef.current.getTracks().forEach((t) => t.stop());
      enrollStreamRef.current = null;
    }
    setEnrollCameraActive(false);
  }

  function snapEnrollPhoto() {
    if (!enrollVideoRef.current) return;
    const video = enrollVideoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `${singleRollNumber || 'student'}.jpg`, { type: 'image/jpeg' });
        setSinglePhoto(file);
        setSinglePhotoPreview(URL.createObjectURL(blob));
        stopEnrollWebcam();
      },
      'image/jpeg',
      0.95
    );
  }

  // Switch tabs & stop unused webcams
  function handleTabChange(tab: 'attendance' | 'enrollment') {
    if (tab === 'enrollment') {
      stopWebcam();
    } else {
      stopEnrollWebcam();
    }
    setActiveTab(tab);
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopWebcam();
      stopEnrollWebcam();
    };
  }, []);

  // When step changes to capture with webcam mode, start webcam if not running
  useEffect(() => {
    if (step === 'capture' && captureMode === 'webcam' && activeTab === 'attendance') {
      startWebcam();
    } else {
      stopWebcam();
    }
  }, [step, captureMode, activeTab]);

  async function capture() {
    if (!photo || !roomId || !assignmentId) {
      setMessage('Choose a room, assignment, and snap/select a photo first.');
      return;
    }
    setBusy(true);
    setMessage('Uploading capture and processing recognition pipeline…');
    stopWebcam();
    try {
      const csrf = await api('/csrf').then((r) => r.json());
      const form = new FormData();
      form.append('image', photo);
      form.append('roomId', String(roomId));
      form.append('cameraId', String(selectedCamera?.id || 1));
      form.append('assignmentId', String(assignmentId));

      const response = await api('/capture', {
        method: 'POST',
        headers: { 'X-XSRF-TOKEN': csrf.token },
        body: form,
      });
      const data = await response.json();
      setSessionId(data.sessionId);
      setStep('review');
      setMessage(`Capture session #${data.sessionId} created (${data.sessionStatus}). Polling for results…`);
      poll(data.sessionId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Capture failed');
    } finally {
      setBusy(false);
    }
  }

  function poll(id: number) {
    let attempts = 0;
    const tick = async () => {
      try {
        const data: Review = await api(`/api/attendance-sessions/${id}/review`).then((r) => r.json());
        setReview(data);
        if (data.status === 'CAPTURED' || data.status === 'PROCESSING') {
          attempts += 1;
          if (attempts < 60) setTimeout(tick, 1000);
        } else {
          setMessage(`Recognition complete: session status is ${data.status}.`);
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Review polling failed');
      }
    };
    tick();
  }

  async function finalize() {
    if (!sessionId || !review) return;
    setBusy(true);
    try {
      const csrf = await api('/csrf').then((r) => r.json());
      const payload = {
        decisions: review.records
          .filter((record) => decisions[record.studentId])
          .map((record) => ({ studentId: record.studentId, decision: decisions[record.studentId] })),
      };
      const response = await api(`/api/attendance-sessions/${sessionId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': csrf.token },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      setMessage(`Session #${data.sessionId} finalized. Unresolved items: ${data.unresolvedReviewCount}.`);
      poll(sessionId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Finalization failed');
    } finally {
      setBusy(false);
    }
  }

  // Single Student Enrollment submit
  async function handleSingleEnroll(e: FormEvent) {
    e.preventDefault();
    if (!singleName.trim() || !singleRollNumber.trim() || !singlePhoto) {
      setMessage('Name, roll number, and a photo are required.');
      return;
    }
    setBusy(true);
    setMessage('Enrolling student and computing facial embedding…');
    try {
      const csrf = await api('/csrf').then((r) => r.json());
      const form = new FormData();
      form.append('name', singleName.trim());
      form.append('rollNumber', singleRollNumber.trim());
      form.append('consentGiven', 'true');
      form.append('photo', singlePhoto);

      const res = await api('/students/enroll-single', {
        method: 'POST',
        headers: { 'X-XSRF-TOKEN': csrf.token },
        body: form,
      });
      const data = await res.json();
      const s = data.student || data;
      setMessage(`Student ${s.name} (${s.rollNumber}) enrolled successfully!`);
      setSingleName('');
      setSingleRollNumber('');
      setSinglePhoto(null);
      setSinglePhotoPreview(null);
      loadRoster();
    } catch (err) {
      setMessage(`Enrollment failed: ${err instanceof Error ? err.message : 'Error'}`);
    } finally {
      setBusy(false);
    }
  }

  // Bulk Enrollment submit
  async function handleBulkEnroll(e: FormEvent) {
    e.preventDefault();
    if (!bulkCsvFile) {
      setMessage('Please select a CSV file first.');
      return;
    }
    if (!bulkZipFile && (!bulkPhotoFiles || bulkPhotoFiles.length === 0)) {
      setMessage('Please upload a ZIP of photos OR select student photo files.');
      return;
    }

    setBusy(true);
    setMessage('Processing bulk enrollment through facial pipeline… this may take a few moments.');
    try {
      const csrf = await api('/csrf').then((r) => r.json());
      const form = new FormData();
      form.append('csvFile', bulkCsvFile);
      if (bulkZipFile) {
        form.append('zipFile', bulkZipFile);
      }
      if (bulkPhotoFiles && bulkPhotoFiles.length > 0) {
        for (let i = 0; i < bulkPhotoFiles.length; i++) {
          form.append('photos', bulkPhotoFiles[i]);
        }
      }

      const res = await api('/students/bulk-enroll', {
        method: 'POST',
        headers: { 'X-XSRF-TOKEN': csrf.token },
        body: form,
      });
      const data: BulkEnrollResponse = await res.json();
      setBulkResults(data);
      setMessage(`Bulk enrollment finished: ${data.successCount} succeeded, ${data.failureCount} failed out of ${data.totalRows} rows.`);
      loadRoster();
    } catch (err) {
      setMessage(`Bulk import error: ${err instanceof Error ? err.message : 'Error'}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <header>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="eyebrow">CLASSSIGHT / FACULTY & ENROLLMENT</span>
          {token && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span className="badge badge-info">{userFullName} ({userRole})</span>
              <button className="secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={logout}>Sign Out</button>
            </div>
          )}
        </div>
        <h1>ClassSight Attendance Hub</h1>
        <p className="lede">
          High-accuracy biometric classroom attendance with automated absent assignment, live webcam capture, and bulk student onboarding.
        </p>
      </header>

      <div className="status" role="status">
        {message || 'Ready. Authentication and session state managed securely.'}
      </div>

      {step === 'login' ? (
        <form className="card form" onSubmit={login}>
          <h2>Sign In</h2>
          <label>
            Username or email
            <input value={usernameOrEmail} onChange={(e) => setUsernameOrEmail(e.target.value)} />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <button disabled={busy}>{busy ? 'Signing in…' : 'Sign in as faculty'}</button>
          <small className="hint">Default demo credentials: <code>teacher</code> / <code>teacher123</code> or <code>admin</code> / <code>admin123</code></small>
        </form>
      ) : (
        <>
          {/* Top Mode Bar */}
          <div className="mode-bar">
            <button
              className={`mode-btn ${activeTab === 'attendance' ? 'active' : ''}`}
              onClick={() => handleTabChange('attendance')}
            >
              Take Attendance
            </button>
            <button
              className={`mode-btn ${activeTab === 'enrollment' ? 'active' : ''}`}
              onClick={() => handleTabChange('enrollment')}
            >
              Student Enrollment ({roster.length} enrolled)
            </button>
          </div>

          {/* ATTENDANCE WORKFLOW */}
          {activeTab === 'attendance' && (
            <>
              <section className="progress">
                <span className={step === 'select' ? 'active' : ''} onClick={() => setStep('select')} style={{ cursor: 'pointer' }}>01 Class & Room</span>
                <span className={step === 'capture' ? 'active' : ''} onClick={() => setStep('capture')} style={{ cursor: 'pointer' }}>02 Photo Capture</span>
                <span className={step === 'review' ? 'active' : ''}>03 Recognition & Results</span>
              </section>

              {step === 'select' && (
                <section className="card form">
                  <h2>Select Session Parameters</h2>
                  <div className="grid">
                    <label>
                      Classroom / Room
                      <select value={roomId ?? ''} onChange={(e) => setRoomId(Number(e.target.value))}>
                        {rooms.map((room) => (
                          <option key={room.id} value={room.id}>
                            {room.name} · {room.building || 'Campus'} (Cap: {room.capacity || '—'})
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Subject & Section
                      <select value={assignmentId ?? ''} onChange={(e) => setAssignmentId(Number(e.target.value))}>
                        {assignments.map((assignment) => (
                          <option key={assignment.id} value={assignment.id}>
                            {assignment.subject.code} — {assignment.subject.name} · {assignment.classSection.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <p className="hint">
                    {selectedCamera
                      ? `Camera: ${selectedCamera.name} (${selectedCamera.status})`
                      : 'Camera: Browser live webcam capture configured.'}
                  </p>
                  <button onClick={() => setStep('capture')} disabled={!roomId || !assignmentId}>
                    Continue to Photo Capture
                  </button>
                </section>
              )}

              {step === 'capture' && (
                <section className="card form">
                  <h2>Capture Classroom Photo</h2>

                  {/* Mode switcher for Capture */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                    <button
                      type="button"
                      className={captureMode === 'webcam' ? '' : 'secondary'}
                      style={{ padding: '8px 14px', fontSize: '13px' }}
                      onClick={() => setCaptureMode('webcam')}
                    >
                      Use Live Webcam
                    </button>
                    <button
                      type="button"
                      className={captureMode === 'file' ? '' : 'secondary'}
                      style={{ padding: '8px 14px', fontSize: '13px' }}
                      onClick={() => {
                        stopWebcam();
                        setCaptureMode('file');
                      }}
                    >
                      Upload Photo File
                    </button>
                  </div>

                  {captureMode === 'webcam' && (
                    <div>
                      {cameraError ? (
                        <div className="status" style={{ borderLeftColor: '#ef4444', color: '#991b1b' }}>
                          {cameraError}
                        </div>
                      ) : (
                        <div className="webcam-box">
                          <video ref={videoRef} className="webcam-video" autoPlay playsInline muted />
                          <div className="webcam-overlay">
                            <button type="button" onClick={snapWebcamPhoto} style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.4)' }}>
                              Snap Attendance Photo
                            </button>
                            {cameraActive ? (
                              <button type="button" className="secondary" onClick={stopWebcam}>Pause Webcam</button>
                            ) : (
                              <button type="button" className="secondary" onClick={startWebcam}>Restart Webcam</button>
                            )}
                          </div>
                        </div>
                      )}

                      {photoPreviewUrl && (
                        <div className="subcard">
                          <span className="eyebrow">PHOTO READY TO SUBMIT</span>
                          <img src={photoPreviewUrl} alt="Snapped attendance capture" className="preview-img" style={{ maxHeight: '240px', marginTop: '8px' }} />
                          <p className="hint">Photo size: {photo ? (photo.size / 1024).toFixed(1) + ' KB' : ''}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {captureMode === 'file' && (
                    <div>
                      <label>
                        Choose classroom photo file
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            const f = e.target.files?.[0] || null;
                            setPhoto(f);
                            if (f) setPhotoPreviewUrl(URL.createObjectURL(f));
                          }}
                        />
                      </label>
                      {photoPreviewUrl && (
                        <div style={{ marginTop: '12px' }}>
                          <img src={photoPreviewUrl} alt="Selected preview" className="preview-img" style={{ maxHeight: '240px' }} />
                          <p className="hint">{photo?.name} · {photo ? (photo.size / 1024 / 1024).toFixed(2) + ' MB' : ''}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="actions" style={{ marginTop: '16px' }}>
                    <button className="secondary" onClick={() => { stopWebcam(); setStep('select'); }}>
                      Back
                    </button>
                    <button onClick={capture} disabled={busy || !photo}>
                      {busy ? 'Processing recognition pipeline…' : 'Submit Capture & Recognize'}
                    </button>
                  </div>
                </section>
              )}

              {step === 'review' && (
                <section className="card">
                  <div className="review-head">
                    <div>
                      <span className="eyebrow">SESSION #{sessionId}</span>
                      <h2>Status: <span style={{ color: review?.status === 'FINALIZED' ? '#166534' : 'inherit' }}>{review?.status || 'Processing…'}</span></h2>
                      {review?.quality?.warning && (
                        <p className="hint" style={{ color: '#b45309' }}>Quality flag: {review.quality.warning}</p>
                      )}
                    </div>
                    {review?.photoUrl && (
                      <a href={`${API}${review.photoUrl}`} target="_blank" rel="noreferrer">
                        View Stored Capture
                      </a>
                    )}
                  </div>

                  {(review?.allRecords?.length || review?.records?.length) ? (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <h3>Attendance Roster & Recognition</h3>
                        <span className="badge badge-info">
                          {(review.allRecords || review.records).filter(r => r.status === 'PRESENT').length} Present · {(review.allRecords || review.records).filter(r => r.status === 'ABSENT').length} Absent · {(review.records || []).length} In Review
                        </span>
                      </div>

                      <div className="records">
                        {(review.allRecords || review.records).map((record) => {
                          const isPresent = record.status === 'PRESENT';
                          const isAbsent = record.status === 'ABSENT';
                          const isReview = record.status === 'REVIEW';

                          return (
                            <div className="record" key={record.recordId}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <strong>{record.studentName}</strong>
                                  <span className={`badge ${isPresent ? 'badge-success' : isAbsent ? 'badge-fail' : 'badge-neutral'}`}>
                                    {record.status}
                                  </span>
                                  {record.recognitionState && (
                                    <span className="badge badge-neutral" style={{ fontSize: '10px' }}>
                                      {record.recognitionState}
                                    </span>
                                  )}
                                </div>
                                <small>
                                  Roll: <code>{record.rollNumber}</code>
                                  {record.confidenceScore !== undefined && record.confidenceScore !== null && (
                                    <> · Confidence: {(record.confidenceScore * 100).toFixed(1)}%</>
                                  )}
                                </small>
                                {record.qualityWarning && (
                                  <small style={{ color: '#b45309' }}>{record.qualityWarning}</small>
                                )}
                              </div>

                              <div className="actions">
                                <button
                                  type="button"
                                  className={decisions[record.studentId] === 'PRESENT' || (isPresent && !decisions[record.studentId]) ? 'selected' : 'secondary'}
                                  style={{ padding: '8px 14px', fontSize: '12px' }}
                                  onClick={() => setDecisions({ ...decisions, [record.studentId]: 'PRESENT' })}
                                >
                                  Present
                                </button>
                                <button
                                  type="button"
                                  className={decisions[record.studentId] === 'ABSENT' || (isAbsent && !decisions[record.studentId]) ? 'selected' : 'secondary'}
                                  style={{ padding: '8px 14px', fontSize: '12px' }}
                                  onClick={() => setDecisions({ ...decisions, [record.studentId]: 'ABSENT' })}
                                >
                                  Absent
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {review?.records && review.records.length > 0 ? (
                        <div style={{ marginTop: '20px', borderTop: '1px solid var(--line)', paddingTop: '16px' }}>
                          <p className="hint">
                            There are {review.records.length} item(s) flagged for manual confirmation.
                          </p>
                          <button
                            onClick={finalize}
                            disabled={busy || review.records.some((record) => !decisions[record.studentId])}
                          >
                            {busy ? 'Finalizing…' : 'Finalize Attendance Session'}
                          </button>
                        </div>
                      ) : (
                        <div className="status" style={{ borderLeftColor: '#10b981', color: '#065f46', background: '#ecfdf5' }}>
                          Automatic Finalization: All students cleanly resolved (Present / Absent) with zero pending manual reviews!
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="hint">Processing capture… polling results from the recognition engine.</p>
                  )}

                  <div style={{ marginTop: '20px' }}>
                    <button className="secondary" onClick={() => setStep('capture')}>
                      Take Another Attendance Photo
                    </button>
                  </div>
                </section>
              )}
            </>
          )}

          {/* STUDENT ENROLLMENT WORKFLOW (P0.2) */}
          {activeTab === 'enrollment' && (
            <div style={{ display: 'grid', gap: '24px' }}>
              {/* Section 1: Bulk Import */}
              <section className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span className="eyebrow">BULK ONBOARDING</span>
                    <h2>Bulk Student Import</h2>
                    <p className="lede" style={{ fontSize: '14px', marginTop: '4px' }}>
                      Upload a CSV of students and their matching photos. Each photo filename must be <code>&lt;roll_number&gt;.jpg</code>.
                    </p>
                  </div>
                  <a
                    href={`${API}/students/template.csv`}
                    download="students-template.csv"
                    className="secondary"
                    style={{
                      display: 'inline-block',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      fontSize: '13px',
                      fontWeight: 700,
                      background: '#eef2ee',
                      color: 'var(--ink)',
                    }}
                  >
                    Download CSV Template
                  </a>
                </div>

                <form onSubmit={handleBulkEnroll} className="form" style={{ marginTop: '16px' }}>
                  <div className="grid">
                    <label>
                      1. Students CSV file (*.csv)
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => setBulkCsvFile(e.target.files?.[0] || null)}
                      />
                      <small className="hint">Columns: <code>roll_number,name</code></small>
                    </label>

                    <label>
                      2A. Photos as a ZIP archive (*.zip)
                      <input
                        type="file"
                        accept=".zip"
                        onChange={(e) => setBulkZipFile(e.target.files?.[0] || null)}
                      />
                      <small className="hint">Archive containing <code>2501320100129.jpg</code>, etc.</small>
                    </label>
                  </div>

                  <label>
                    2B. OR select multiple photo files directly
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => setBulkPhotoFiles(e.target.files)}
                    />
                    <small className="hint">
                      {bulkPhotoFiles ? `${bulkPhotoFiles.length} photo(s) selected` : 'You can select multiple photos at once'}
                    </small>
                  </label>

                  <button disabled={busy || !bulkCsvFile || (!bulkZipFile && (!bulkPhotoFiles || bulkPhotoFiles.length === 0))}>
                    {busy ? 'Running Facial Pipeline…' : 'Start Bulk Enrollment'}
                  </button>
                </form>

                {bulkResults && (
                  <div style={{ marginTop: '24px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '10px' }}>
                      <h3>Bulk Import Results</h3>
                      <span className="badge badge-success">{bulkResults.successCount} Succeeded</span>
                      {bulkResults.failureCount > 0 && (
                        <span className="badge badge-fail">{bulkResults.failureCount} Failed</span>
                      )}
                    </div>

                    <div className="table-container">
                      <table className="styled-table">
                        <thead>
                          <tr>
                            <th>Roll Number</th>
                            <th>Name</th>
                            <th>Status</th>
                            <th>Diagnostic Message</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bulkResults.results.map((row) => (
                            <tr key={row.rollNumber}>
                              <td><code>{row.rollNumber}</code></td>
                              <td><strong>{row.name}</strong></td>
                              <td>
                                <span className={`badge ${row.success ? 'badge-success' : 'badge-fail'}`}>
                                  {row.success ? 'ENROLLED' : 'FAILED'}
                                </span>
                              </td>
                              <td style={{ color: row.success ? '#166534' : '#991b1b' }}>{row.message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </section>

              {/* Section 2: Single Student Add */}
              <section className="card">
                <span className="eyebrow">MANUAL / FALLBACK ENROLLMENT</span>
                <h2>Add Single Student</h2>
                <p className="hint">Enroll an individual student live via webcam snapshot or photo upload.</p>

                <form onSubmit={handleSingleEnroll} className="form" style={{ marginTop: '14px' }}>
                  <div className="grid">
                    <label>
                      Student Full Name
                      <input
                        placeholder="e.g. Vishesh Sharma"
                        value={singleName}
                        onChange={(e) => setSingleName(e.target.value)}
                      />
                    </label>
                    <label>
                      Roll Number
                      <input
                        placeholder="e.g. 2501320100129"
                        value={singleRollNumber}
                        onChange={(e) => setSingleRollNumber(e.target.value)}
                      />
                    </label>
                  </div>

                  <div>
                    <label>Photo Capture Method</label>
                    <div style={{ display: 'flex', gap: '8px', margin: '8px 0' }}>
                      <button
                        type="button"
                        className={enrollCameraActive ? '' : 'secondary'}
                        style={{ padding: '8px 12px', fontSize: '13px' }}
                        onClick={startEnrollWebcam}
                      >
                        Open Live Camera
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        style={{ padding: '8px 12px', fontSize: '13px' }}
                        onClick={stopEnrollWebcam}
                      >
                        Close Camera
                      </button>
                    </div>

                    {enrollCameraActive && (
                      <div className="webcam-box" style={{ maxWidth: '400px' }}>
                        <video ref={enrollVideoRef} className="webcam-video" autoPlay playsInline muted />
                        <div className="webcam-overlay">
                          <button type="button" onClick={snapEnrollPhoto}>Snap Student Face</button>
                        </div>
                      </div>
                    )}

                    <div style={{ marginTop: '12px' }}>
                      <label>
                        Or upload a single photo file
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            const f = e.target.files?.[0] || null;
                            setSinglePhoto(f);
                            if (f) setSinglePhotoPreview(URL.createObjectURL(f));
                          }}
                        />
                      </label>
                    </div>

                    {singlePhotoPreview && (
                      <div style={{ marginTop: '12px' }}>
                        <img src={singlePhotoPreview} alt="Preview" className="preview-img" style={{ maxHeight: '160px', width: 'auto' }} />
                        <p className="hint">Photo selected for {singleRollNumber || 'student'}</p>
                      </div>
                    )}
                  </div>

                  <button disabled={busy || !singleName.trim() || !singleRollNumber.trim() || !singlePhoto}>
                    {busy ? 'Enrolling…' : 'Enroll Student'}
                  </button>
                </form>
              </section>

              {/* Section 3: Enrolled Students Roster */}
              <section className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span className="eyebrow">DATABASE ROSTER</span>
                    <h2>Enrolled Students ({roster.length})</h2>
                  </div>
                  <button className="secondary" style={{ padding: '8px 14px', fontSize: '13px' }} onClick={loadRoster}>
                    {loadingRoster ? 'Refreshing…' : 'Refresh Roster'}
                  </button>
                </div>

                {roster.length === 0 ? (
                  <p className="hint" style={{ marginTop: '14px' }}>
                    No students currently enrolled in the database. Use Bulk Import or Single Student Add above.
                  </p>
                ) : (
                  <div className="table-container">
                    <table className="styled-table">
                      <thead>
                        <tr>
                          <th>Roll Number</th>
                          <th>Full Name</th>
                          <th>Biometrics</th>
                          <th>Enrolled Date</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {roster.map((s) => (
                          <tr key={s.id}>
                            <td><code>{s.rollNumber}</code></td>
                            <td><strong>{s.name}</strong></td>
                            <td>
                              <span className={`badge ${s.faceRegistered ? 'badge-success' : 'badge-fail'}`}>
                                {s.faceRegistered ? '128-d Registered' : 'Missing Embedding'}
                              </span>
                            </td>
                            <td><small>{s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '—'}</small></td>
                            <td>
                              <span className={`badge ${s.active ? 'badge-info' : 'badge-neutral'}`}>
                                {s.active ? 'ACTIVE' : 'INACTIVE'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          )}
        </>
      )}

      <footer>
        ClassSight Intelligent Attendance · Frontend: Next.js · Backend: Spring Boot 3.4.3 & FastAPI dlib engine
      </footer>
    </main>
  );
}
