'use client';

import { useState } from 'react';

export function EligibilityCalculator() {
  const [held, setHeld] = useState('20');
  const [attended, setAttended] = useState('16');
  const [threshold, setThreshold] = useState('75');

  const heldCount = Number(held) || 0;
  const attendedCount = Number(attended) || 0;
  const thresholdValue = Number(threshold) || 0;
  const percentage = heldCount > 0 ? Math.min(100, (attendedCount / heldCount) * 100) : null;
  const required = Math.ceil((thresholdValue / 100) * heldCount);
  const missing = percentage === null ? null : Math.max(0, required - attendedCount);

  return (
    <section className="section-card" aria-labelledby="eligibility-heading">
      <div className="section-head">
        <div>
          <h2 id="eligibility-heading">Calculate your attendance</h2>
          <p className="hint">Everything is calculated in your browser. Nothing is sent or stored.</p>
        </div>
        <span className="badge badge-amber">Not an official result</span>
      </div>
      <div className="form-grid-3">
        <label>Sessions held<input inputMode="numeric" value={held} onChange={(event) => setHeld(event.target.value)} /></label>
        <label>Sessions attended<input inputMode="numeric" value={attended} onChange={(event) => setAttended(event.target.value)} /></label>
        <label>Threshold (%)
          <select value={threshold} onChange={(event) => setThreshold(event.target.value)}>
            <option value="60">60</option>
            <option value="70">70</option>
            <option value="75">75</option>
            <option value="80">80</option>
          </select>
        </label>
      </div>
      <div className="stat-grid" style={{ marginTop: 18 }} role="status" aria-live="polite">
        <div className="stat-card blue"><div className="stat-value">{percentage === null ? '—' : `${percentage.toFixed(1)}%`}</div><div className="stat-label">Attendance so far</div></div>
        <div className="stat-card green"><div className="stat-value">{required}</div><div className="stat-label">Sessions needed for the threshold</div></div>
        <div className={`stat-card ${missing && missing > 0 ? 'amber' : 'purple'}`}><div className="stat-value">{missing === null ? '—' : missing}</div><div className="stat-label">Sessions still short</div></div>
      </div>
      <p className="hint" style={{ marginTop: 12 }}>The threshold options are illustrative. Your institution decides the real rule, and your institution is the only source of truth for your attendance.</p>
    </section>
  );
}
