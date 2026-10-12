// ─── Types ────────────────────────────────────────────────────────────────────
export type Room = { id: number; name: string; building?: string; capacity?: number; active: boolean };
export type Camera = { id: number; name: string; status: string; room?: { id: number } };
export type Assignment = {
  id: number;
  subject: { id: number; code: string; name: string };
  classSection: { id: number; name: string; academicYear: number };
  active: boolean;
};
export type ReviewRecord = {
  recordId: number; studentId: number; studentName: string; rollNumber: string;
  status: string; recognitionState?: string; confidenceScore?: number; qualityWarning?: string;
};
export type RecognitionDiagnostic = {
  face_index?: number; face_width_px?: number; face_height_px?: number;
  distance?: number; second_best_distance?: number; margin?: number;
  recognition_state?: string; rejection_reason?: string;
  detector?: string; detector_scale?: string;
};
export type Review = {
  sessionId: number; status: string; records: ReviewRecord[]; allRecords?: ReviewRecord[];
  photoUrl: string;
  capturePhase?: 'QUEUED' | 'DETECTING' | 'MATCHING' | 'DONE' | string;
  quality?: { warning?: string };
  diagnostics?: RecognitionDiagnostic[];
  timings?: Record<string, number>;
};
export type StudentRosterItem = {
  id: number; rollNumber: string; name: string; active: boolean;
  createdAt: string; faceRegistered: boolean;
};
export type BulkEnrollResponse = {
  totalRows: number; successCount: number; failureCount: number;
  results: { rollNumber: string; name: string; success: boolean; message: string }[];
};
export type TimetablePeriod = {
  session: {
    id: number; date: string; startTime: string; endTime: string; status: string;
    subjectCode: string; subjectName: string; subjectId: number;
    sectionName: string; sectionId: number;
    teacherUsername: string; roomId: number; roomName: string;
  } | null;
  captureAllowed: boolean; windowOpen: string; windowClose: string;
};
export type TimetableSession = {
  id: number; date: string; startTime: string; endTime: string; status: string;
  subjectCode?: string; sectionName?: string; roomName?: string;
};
export type TimetableSlot = {
  id: number; dayOfWeek: number; startTime: string; endTime: string;
  subjectCode?: string; subjectName?: string;
  sectionName?: string; teacherUsername?: string; roomName?: string;
};
export type Dispute = {
  id: number; studentName?: string; rollNumber?: string;
  sessionDate?: string; subjectCode?: string;
  status: string; reason: string; resolvedNote?: string; createdAt: string;
};
export type AuditLog = {
  id: number; studentName?: string; rollNumber?: string;
  fieldChanged: string; oldValue?: string; newValue?: string;
  changedByUsername?: string; changedAt: string; reason?: string;
};
export type AnalyticsStudent = {
  studentId: number; studentName: string; rollNumber: string;
  attended: number; total: number; percentage: number;
  subjectName?: string; subjectCode?: string;
};
export type AnalyticsSummary = {
  subjectCode: string; subjectName: string; sectionName: string;
  students: AnalyticsStudent[];
  averageAttendance: number; shortfallCount: number;
};

export type AuthResponse = {
  token: string;
  fullName?: string;
  username: string;
  role: string;
};

export type CsrfResponse = {
  token: string;
};

const API = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8080';

// ─── API Client ────────────────────────────────────────────────────────────────
export class ApiClient {
  private token: string = '';

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = '';
  }

  async refresh(): Promise<AuthResponse> {
    const res = await fetch(`${API}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) {
      throw new Error('Refresh session expired');
    }
    const body = await res.json() as AuthResponse;
    this.setToken(body.token);
    return body;
  }

  private async fetch(path: string, opts: RequestInit = {}): Promise<Response> {
    const headers = new Headers(opts.headers);
    if (this.token) {
      headers.set('Authorization', 'Bearer ' + this.token);
    }
    let res = await fetch(`${API}${path}`, { ...opts, headers, credentials: 'include' });
    if (res.status === 401 && path !== '/auth/refresh' && path !== '/auth/login') {
      const refreshed = await fetch(`${API}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (refreshed.ok) {
        const body = await refreshed.json() as AuthResponse;
        this.setToken(body.token);
        headers.set('Authorization', 'Bearer ' + body.token);
        res = await fetch(`${API}${path}`, { ...opts, headers, credentials: 'include' });
      }
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${res.status}: ${text}`);
    }
    return res;
  }

  async login(usernameOrEmail: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ usernameOrEmail, password }),
    });
    if (!res.ok) {
      throw new Error(`Login failed (${res.status})`);
    }
    return res.json();
  }

  async getCsrf(): Promise<CsrfResponse> {
    return this.fetch('/csrf').then(r => r.json());
  }

  // ─── Rooms & Cameras ─────────────────────────────────────────────────────
  async getRooms(): Promise<Room[]> {
    return this.fetch('/api/rooms').then(r => r.json());
  }

  async getCameras(): Promise<Camera[]> {
    return this.fetch('/api/cameras').then(r => r.json());
  }

  // ─── Assignments ────────────────────────────────────────────────────────
  async getTeacherAssignments(): Promise<Assignment[]> {
    return this.fetch('/teacher/assignments').then(r => r.json());
  }

  // ─── Timetable ───────────────────────────────────────────────────────────
  async getCurrentPeriod(): Promise<TimetablePeriod> {
    return this.fetch('/api/timetable/current-period').then(r => r.json());
  }

  // ─── Capture & Attendance ────────────────────────────────────────────────
  async capture(formData: FormData, csrfToken: string): Promise<any> {
    return this.fetch('/capture', {
      method: 'POST',
      headers: { 'X-XSRF-TOKEN': csrfToken },
      body: formData,
    }).then(r => r.json());
  }

  async getReview(sessionId: number): Promise<Review> {
    return this.fetch(`/api/attendance-sessions/${sessionId}/review`).then(r => r.json());
  }

  async submitReview(sessionId: number, decisions: any[], csrfToken: string): Promise<any> {
    return this.fetch(`/api/attendance-sessions/${sessionId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': csrfToken },
      body: JSON.stringify({ decisions }),
    }).then(r => r.json());
  }

  // ─── Enrollment ─────────────────────────────────────────────────────────
  async getStudentRoster(): Promise<StudentRosterItem[]> {
    return this.fetch('/students').then(r => r.json());
  }

  async enrollStudent(formData: FormData, csrfToken: string): Promise<any> {
    return this.fetch('/students/enroll', {
      method: 'POST',
      headers: { 'X-XSRF-TOKEN': csrfToken },
      body: formData,
    }).then(r => r.json());
  }

  async bulkEnroll(formData: FormData, csrfToken: string): Promise<BulkEnrollResponse> {
    return this.fetch('/students/bulk-enroll', {
      method: 'POST',
      headers: { 'X-XSRF-TOKEN': csrfToken },
      body: formData,
    }).then(r => r.json());
  }

  // ─── Analytics ─────────────────────────────────────────────────────────
  async getAnalytics(subjectId?: number): Promise<AnalyticsSummary> {
    const url = subjectId ? `/api/analytics?subjectId=${subjectId}` : '/api/analytics';
    return this.fetch(url).then(r => r.json());
  }

  // ─── HOD ───────────────────────────────────────────────────────────────
  async getDisputes(): Promise<Dispute[]> {
    return this.fetch('/api/disputes').then(r => r.json());
  }

  async getAuditLogs(studentId?: number): Promise<AuditLog[]> {
    const url = studentId ? `/api/audit-logs?studentId=${studentId}` : '/api/audit-logs';
    return this.fetch(url).then(r => r.json());
  }

  // ─── Student ───────────────────────────────────────────────────────────
  async getStudentAttendance(): Promise<any> {
    return this.fetch('/student/attendance').then(r => r.json());
  }

  async getStudentTimetable(): Promise<TimetableSession[]> {
    return this.fetch('/student/timetable').then(r => r.json());
  }

  async raiseDispute(formData: FormData, csrfToken: string): Promise<any> {
    return this.fetch('/student/disputes', {
      method: 'POST',
      headers: { 'X-XSRF-TOKEN': csrfToken },
      body: formData,
    }).then(r => r.json());
  }
}

// Singleton instance
export const api = new ApiClient();
