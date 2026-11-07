'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageLayout } from '@/components/PageLayout';
import { RouteState } from '@/components/RouteState';
import { api, type AnalyticsAssignment, type Assignment } from '@/lib/api';

export default function AnalyticsPage() {
  const [rows, setRows] = useState<AnalyticsAssignment[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAnalyticsAssignments()
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch((error: unknown) => setMsg(error instanceof Error ? error.message : 'Unable to load analytics.'))
      .finally(() => setLoading(false));
    api.getTeacherAssignments()
      .then((data) => setAssignments(data))
      .catch(() => setAssignments([]));
  }, []);

  const named = useMemo(() => rows.map((row) => {
    const assignment = assignments.find((item) => item.subject?.id === row.subjectId && item.classSection?.id === row.classSectionId);
    const percentages = row.students.map((student) => student.attendancePercentage);
    const average = percentages.length ? percentages.reduce((sum, value) => sum + value, 0) / percentages.length : null;
    return {
      key: `${row.subjectId}-${row.classSectionId}`,
      label: assignment ? `${assignment.subject.code} — ${assignment.subject.name}` : `Subject ${row.subjectId}`,
      section: assignment?.classSection?.name ?? `Section ${row.classSectionId}`,
      row,
      average,
    };
  }), [assignments, rows]);

  const totals = useMemo(() => ({
    assignments: rows.length,
    conducted: rows.reduce((sum, row) => sum + row.conductedSessionCount, 0),
    finalized: rows.reduce((sum, row) => sum + row.finalizedSessionCount, 0),
    defaulters: rows.reduce((sum, row) => sum + row.defaulters.length, 0),
    students: new Set(rows.flatMap((row) => row.students.map((student) => student.studentId))).size,
  }), [rows]);

  return (
    <PageLayout pageId="analytics">
      <h1 className="sr-only">Attendance insights</h1>

      <div className="section-card">
        <div className="section-head">
          <div>
            <span className="eyebrow">Analytics</span>
            <h2>Attendance insights</h2>
            <p className="hint">Computed from finalised sessions for your own assignments. Nothing is exported or sent anywhere.</p>
          </div>
          <span className="badge badge-blue">Read only</span>
        </div>

        <RouteState loading={loading} error={msg} empty={!loading && rows.length === 0} emptyMessage="No attendance analytics are available yet. Finalise a session first.">
          <div className="stats-grid">
            <div className="stat-card blue"><div className="stat-value">{totals.assignments}</div><div className="stat-label">Assignments tracked</div></div>
            <div className="stat-card green"><div className="stat-value">{totals.conducted}</div><div className="stat-label">Sessions conducted</div></div>
            <div className="stat-card purple"><div className="stat-value">{totals.finalized}</div><div className="stat-label">Sessions finalised</div></div>
            <div className="stat-card amber"><div className="stat-value">{totals.defaulters}</div><div className="stat-label">Students below threshold</div></div>
          </div>

          <div className="table-wrap">
            <table>
              <caption className="sr-only">Attendance per assignment</caption>
              <thead>
                <tr>
                  <th scope="col">Assignment</th>
                  <th scope="col">Conducted</th>
                  <th scope="col">Finalised</th>
                  <th scope="col">Students</th>
                  <th scope="col">Below threshold</th>
                  <th scope="col">Average attendance</th>
                </tr>
              </thead>
              <tbody>
                {named.map((item) => (
                  <tr key={item.key}>
                    <th scope="row">{item.label}<br /><span className="muted">{item.section}</span></th>
                    <td>{item.row.conductedSessionCount}</td>
                    <td>{item.row.finalizedSessionCount}</td>
                    <td>{item.row.students.length}</td>
                    <td>{item.row.defaulters.length > 0 ? <span className="badge badge-amber">{item.row.defaulters.length}</span> : <span className="muted">0</span>}</td>
                    <td>{item.average === null ? <span className="muted">No sessions</span> : `${item.average.toFixed(1)}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {named.map((item) => (
            <details className="state-preview" key={`detail-${item.key}`}>
              <summary>{item.label} · {item.section} · per student</summary>
              {item.row.students.length > 0 ? (
                <div className="table-wrap" style={{ marginTop: 12 }}>
                  <table>
                    <caption className="sr-only">Per student attendance for {item.label}</caption>
                    <thead>
                      <tr><th scope="col">Student</th><th scope="col">Roll number</th><th scope="col">Present</th><th scope="col">Sessions</th><th scope="col">Percentage</th></tr>
                    </thead>
                    <tbody>
                      {item.row.students.map((student) => (
                        <tr key={`${item.key}-${student.studentId}`}>
                          <th scope="row">{student.studentName}</th>
                          <td>{student.rollNumber}</td>
                          <td>{student.presentCount}</td>
                          <td>{student.sessionCount}</td>
                          <td>{student.attendancePercentage.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="hint" style={{ marginTop: 10 }}>No student rows yet for this assignment.</p>
              )}
            </details>
          ))}
        </RouteState>
      </div>

      <section className="section-card" aria-labelledby="analytics-boundaries">
        <div className="section-head"><h2 id="analytics-boundaries">What this page does not do</h2></div>
        <ul className="honesty-list">
          <li>Face embeddings are not yet encrypted at rest.</li>
          <li>Nothing is auto-committed: a faculty member must review each attendance record before it is committed.</li>
          <li>No ERP vendor is confirmed, so nothing is pushed to an external system.</li>
          <li>The threshold shown per assignment is the institution default; changing it is an administrator setting.</li>
        </ul>
      </section>
    </PageLayout>
  );
}
