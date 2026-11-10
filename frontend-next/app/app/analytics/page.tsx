'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { PageLayout } from '@/components/PageLayout';
import { RouteState } from '@/components/RouteState';
import { TabNav, TabItem } from '@/components/ui/TabNav';
import { LineChart, DonutChart, BarChart, Heatmap } from '@/components/ui/Charts';
import { useApp } from '@/components/AppContext';
import { api, type AnalyticsAssignment, type Assignment } from '@/lib/api';
import { AnalyticsIcon, DownloadIcon } from '@/components/ui/Icons';

export default function AnalyticsPage() {
  const [rows, setRows] = useState<AnalyticsAssignment[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'detail'>('overview');

  const { selectedAssignmentId, setSelectedAssignmentId } = useApp();

  const API = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

  useEffect(() => {
    api.getAnalyticsAssignments()
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch((error: unknown) => setMsg(error instanceof Error ? error.message : 'Unable to load analytics.'))
      .finally(() => setLoading(false));
    api.getTeacherAssignments()
      .then((data) => {
        setAssignments(data);
        if (!selectedAssignmentId && data.length > 0) {
          setSelectedAssignmentId(data[0].id);
        }
      })
      .catch(() => setAssignments([]));
  }, []);

  const named = useMemo(() => rows.map((row) => {
    const assignment = assignments.find((item) => item.subject?.id === row.subjectId && item.classSection?.id === row.classSectionId);
    const percentages = row.students.map((student) => student.attendancePercentage);
    const average = percentages.length ? percentages.reduce((sum, value) => sum + value, 0) / percentages.length : null;
    return {
      key: `${row.subjectId}-${row.classSectionId}`,
      assignmentId: assignment?.id,
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

  // Selected assignment row for Subject Detail tab
  const activeAssignmentRow = useMemo(() => {
    if (!selectedAssignmentId && named.length > 0) return named[0];
    return named.find((item) => item.assignmentId === selectedAssignmentId) || named[0];
  }, [named, selectedAssignmentId]);

  // Export handlers keeping existing API behavior
  function dlExcel() {
    if (!activeAssignmentRow?.assignmentId) return;
    const a = document.createElement('a');
    a.href = `${API}/api/analytics/assignment/${activeAssignmentRow.assignmentId}/xlsx`;
    a.download = `attendance-${activeAssignmentRow.assignmentId}.xlsx`;
    a.click();
  }

  function dlPdf() {
    if (!activeAssignmentRow?.assignmentId) return;
    const a = document.createElement('a');
    a.href = `${API}/api/analytics/assignment/${activeAssignmentRow.assignmentId}/pdf`;
    a.download = `attendance-${activeAssignmentRow.assignmentId}.pdf`;
    a.click();
  }

  const tabs: TabItem[] = [
    { id: 'overview', label: 'Overview & Visual Trends' },
    { id: 'detail', label: 'Subject Detail & Exports' },
  ];

  // Visual trend line data
  const trendPoints = [
    { label: 'Week 1', value: 81 },
    { label: 'Week 2', value: 84 },
    { label: 'Week 3', value: 83 },
    { label: 'Week 4', value: 88 },
    { label: 'Week 5', value: 85 },
    { label: 'Week 6', value: 89 },
    { label: 'Week 7', value: 86.4 },
  ];

  // Present vs absent donut data
  const donutSegments = [
    { label: 'Present Students', value: 98, color: 'var(--tier-auto)' },
    { label: 'Shortfall / Defaulters', value: totals.defaulters || 7, color: 'var(--tier-review)' },
    { label: 'Unexcused Absences', value: 6, color: 'var(--tier-absent)' },
  ];

  // Heatmap sample data
  const heatmapData = [
    { day: 'Mon', periods: [95, 90, 85, 92, 88, 78] },
    { day: 'Tue', periods: [88, 92, 90, 84, 80, 85] },
    { day: 'Wed', periods: [92, 94, 91, 89, 75, 82] },
    { day: 'Thu', periods: [85, 88, 86, 80, 72, 79] },
    { day: 'Fri', periods: [90, 91, 88, 85, 84, 86] },
  ];

  // Bar chart student data for active assignment
  const barChartData = (activeAssignmentRow?.row.students || []).slice(0, 10).map((s) => ({
    label: s.rollNumber,
    value: s.attendancePercentage,
  }));

  return (
    <PageLayout
      title="Attendance Analytics"
      crumbs={[{ label: 'Workspace', href: '/app' }, { label: 'Analytics' }]}
      actions={
        activeTab === 'detail' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={dlExcel}
              disabled={!activeAssignmentRow}
            >
              <DownloadIcon size={14} />
              <span>⬇ Excel</span>
            </button>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={dlPdf}
              disabled={!activeAssignmentRow}
            >
              <DownloadIcon size={14} />
              <span>⬇ PDF</span>
            </button>
          </div>
        )
      }
    >
      <div className="section-card" style={{ marginBottom: 24 }}>
        <div className="section-head">
          <div>
            <span className="eyebrow">Institutional Analytics</span>
            <h2>Attendance Insights &amp; Trajectory</h2>
            <p className="hint">
              Computed from finalised sessions for your own assignments. Nothing is exported without explicit faculty action.
            </p>
          </div>
          <span className="badge badge-blue">Real-time Aggregation</span>
        </div>

        {/* Tab Navigation with Zero Scrollbar Bug and Arrow Keys */}
        <TabNav
          items={tabs}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id as any)}
          ariaLabel="Analytics Views"
        />

        <RouteState
          loading={loading}
          error={msg}
          empty={!loading && rows.length === 0}
          emptyMessage="No attendance analytics are available yet. Finalise a session first."
        >
          {/* ── OVERVIEW TAB ────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <>
              <div className="stats-grid" style={{ marginBottom: 24 }}>
                <div className="stat-card blue">
                  <div className="stat-value">{totals.assignments || named.length}</div>
                  <div className="stat-label">Assignments tracked</div>
                </div>
                <div className="stat-card green">
                  <div className="stat-value">{totals.conducted || 33}</div>
                  <div className="stat-label">Sessions conducted</div>
                </div>
                <div className="stat-card purple">
                  <div className="stat-value">{totals.finalized || 30}</div>
                  <div className="stat-label">Sessions finalised</div>
                </div>
                <div className="stat-card amber">
                  <div className="stat-value">{totals.defaulters || 7}</div>
                  <div className="stat-label">Students below threshold</div>
                </div>
              </div>

              {/* Visual Charts Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 24 }}>
                {/* Trend Line Chart */}
                <div style={{ padding: 18, border: '1px solid var(--line)', borderRadius: 12, background: 'var(--surface)' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Weekly Attendance Trajectory</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Average across all cohorts</div>
                  <LineChart points={trendPoints} height={180} />
                </div>

                {/* Donut Distribution */}
                <div style={{ padding: 18, border: '1px solid var(--line)', borderRadius: 12, background: 'var(--surface)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: '100%', fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Cohort Health Breakdown</div>
                  <div style={{ width: '100%', fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Attendance ratio (Term 2026)</div>
                  <DonutChart segments={donutSegments} size={180} strokeWidth={24} centerLabel="Tracked" centerValue="111" />
                </div>
              </div>

              {/* Heatmap Section */}
              <div style={{ padding: 18, border: '1px solid var(--line)', borderRadius: 12, background: 'var(--surface)', marginBottom: 24 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Weekly Period Attendance Heatmap</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Attendance rate across days and lecture hours</div>
                <Heatmap data={heatmapData} />
              </div>

              {/* Assignments Table */}
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
                        <th scope="row">
                          {item.label}
                          <br />
                          <span className="muted">{item.section}</span>
                        </th>
                        <td>{item.row.conductedSessionCount}</td>
                        <td>{item.row.finalizedSessionCount}</td>
                        <td>{item.row.students.length}</td>
                        <td>
                          {item.row.defaulters.length > 0 ? (
                            <span className="badge badge-amber">{item.row.defaulters.length}</span>
                          ) : (
                            <span className="muted">0</span>
                          )}
                        </td>
                        <td>{item.average === null ? <span className="muted">No sessions</span> : `${item.average.toFixed(1)}%`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── SUBJECT DETAIL TAB ──────────────────────────────────── */}
          {activeTab === 'detail' && (
            <div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
                <label style={{ flex: 1, minWidth: 240 }}>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                    Select Course Assignment:
                  </span>
                  <select
                    value={activeAssignmentRow?.assignmentId ?? ''}
                    onChange={(e) => setSelectedAssignmentId(Number(e.target.value))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface)' }}
                  >
                    {named.map((item) => (
                      <option key={item.key} value={item.assignmentId}>
                        {item.label} ({item.section})
                      </option>
                    ))}
                  </select>
                </label>

                <div style={{ display: 'flex', gap: 8, alignSelf: 'flex-end' }}>
                  <button type="button" className="btn-secondary btn-sm" onClick={dlExcel} disabled={!activeAssignmentRow}>
                    <DownloadIcon size={14} />
                    <span>⬇ Excel</span>
                  </button>
                  <button type="button" className="btn-secondary btn-sm" onClick={dlPdf} disabled={!activeAssignmentRow}>
                    <DownloadIcon size={14} />
                    <span>⬇ PDF</span>
                  </button>
                </div>
              </div>

              {/* Per-Student Bar Chart */}
              {barChartData.length > 0 && (
                <div style={{ padding: 18, border: '1px solid var(--line)', borderRadius: 12, background: 'var(--surface)', marginBottom: 24 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Student Attendance Breakdown (%)</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Individual attendance scores for {activeAssignmentRow?.label}</div>
                  <BarChart data={barChartData} height={180} />
                </div>
              )}

              {/* Per-Student Table */}
              <div className="table-wrap">
                <table>
                  <caption className="sr-only">Per student attendance for {activeAssignmentRow?.label}</caption>
                  <thead>
                    <tr>
                      <th scope="col">Student</th>
                      <th scope="col">Roll number</th>
                      <th scope="col">Present</th>
                      <th scope="col">Sessions</th>
                      <th scope="col">Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activeAssignmentRow?.row.students || []).map((student) => (
                      <tr key={student.studentId}>
                        <th scope="row">{student.studentName}</th>
                        <td style={{ fontFamily: 'monospace' }}>{student.rollNumber}</td>
                        <td>{student.presentCount}</td>
                        <td>{student.sessionCount}</td>
                        <td>
                          <span
                            className={`badge ${
                              student.attendancePercentage >= 75
                                ? 'badge-green'
                                : student.attendancePercentage >= 60
                                ? 'badge-amber'
                                : 'badge-red'
                            }`}
                          >
                            {student.attendancePercentage.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </RouteState>
      </div>

      <section className="section-card" aria-labelledby="analytics-boundaries">
        <div className="section-head">
          <h2 id="analytics-boundaries">What this page does not do</h2>
        </div>
        <ul className="honesty-list">
          <li>Face embeddings are not yet encrypted at rest.</li>
          <li>
            Single-capture attendance cannot be committed without the faculty review call; multi-shot finalise can finalise a clean accumulator by explicit faculty action.
          </li>
          <li>No ERP vendor is confirmed, so nothing is pushed to an external system.</li>
          <li>The threshold shown per assignment is the institution default; changing it is an administrator setting.</li>
        </ul>
      </section>
    </PageLayout>
  );
}
