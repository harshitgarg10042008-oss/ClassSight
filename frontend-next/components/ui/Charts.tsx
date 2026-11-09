'use client';

import React, { useState } from 'react';

// ─── DonutChart (AUTO vs REVIEW vs UNKNOWN vs ABSENT) ─────────────────────────
export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

export function DonutChart({
  segments,
  size = 180,
  strokeWidth = 24,
  centerLabel = 'Total',
  centerValue,
}: {
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerValue?: string | number;
}) {
  const total = segments.reduce((acc, s) => acc + s.value, 0) || 1;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div className="cs-donut-container" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--line)"
          strokeWidth={strokeWidth}
        />
        {segments.map((seg, idx) => {
          const percent = seg.value / total;
          const strokeDasharray = `${percent * circumference} ${circumference}`;
          const strokeDashoffset = -accumulatedPercent * circumference;
          accumulatedPercent += percent;

          return (
            <circle
              key={idx}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            >
              <title>{`${seg.label}: ${seg.value} (${Math.round(percent * 100)}%)`}</title>
            </circle>
          );
        })}
      </svg>
      <div className="cs-donut-center">
        <span className="cs-donut-val tabular-nums">{centerValue !== undefined ? centerValue : total}</span>
        <span className="cs-donut-lbl">{centerLabel}</span>
      </div>
    </div>
  );
}

// ─── BarChart ─────────────────────────────────────────────────────────────────
export interface BarData {
  label: string;
  value: number;
  secondaryValue?: number;
}

export function BarChart({
  data,
  height = 180,
  barColor = 'var(--lagoon-600)',
  secondaryColor = 'var(--tier-review)',
}: {
  data: BarData[];
  height?: number;
  barColor?: string;
  secondaryColor?: string;
}) {
  const maxValue = Math.max(...data.map((d) => Math.max(d.value, d.secondaryValue || 0)), 10);

  return (
    <div className="cs-barchart-container" style={{ height }}>
      <div className="cs-barchart-bars">
        {data.map((item, idx) => {
          const heightPercent = (item.value / maxValue) * 100;
          const secHeightPercent = item.secondaryValue ? (item.secondaryValue / maxValue) * 100 : 0;

          return (
            <div key={idx} className="cs-barchart-col">
              <div className="cs-barchart-bar-track">
                {secHeightPercent > 0 && (
                  <div
                    className="cs-barchart-bar secondary"
                    style={{ height: `${secHeightPercent}%`, backgroundColor: secondaryColor }}
                    title={`${item.label} (Secondary): ${item.secondaryValue}`}
                  />
                )}
                <div
                  className="cs-barchart-bar"
                  style={{ height: `${heightPercent}%`, backgroundColor: barColor }}
                  title={`${item.label}: ${item.value}`}
                />
              </div>
              <span className="cs-barchart-label">{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── LineChart ────────────────────────────────────────────────────────────────
export interface LinePoint {
  label: string;
  value: number;
}

export function LineChart({
  points,
  height = 180,
  lineColor = 'var(--lagoon-600)',
}: {
  points: LinePoint[];
  height?: number;
  lineColor?: string;
}) {
  if (points.length < 2) return null;

  const width = 360;
  const padding = 20;
  const values = points.map((p) => p.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const coords = points.map((p, idx) => {
    const x = padding + (idx / (points.length - 1)) * (width - padding * 2);
    const y = height - padding - ((p.value - minVal) / range) * (height - padding * 2);
    return { x, y, point: p };
  });

  const pathD = `M ${coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' L ')}`;

  return (
    <div className="cs-linechart-container">
      <svg viewBox={`0 0 ${width} ${height}`} className="cs-linechart-svg">
        {/* Horizontal gridlines */}
        {[0, 0.5, 1].map((pct, idx) => {
          const y = padding + pct * (height - padding * 2);
          return (
            <line
              key={idx}
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke="var(--line)"
              strokeDasharray="4 4"
            />
          );
        })}
        {/* The line */}
        <path
          d={pathD}
          fill="none"
          stroke={lineColor}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Data points */}
        {coords.map((c, idx) => (
          <circle
            key={idx}
            cx={c.x}
            cy={c.y}
            r="4"
            fill="var(--surface)"
            stroke={lineColor}
            strokeWidth="2.5"
          >
            <title>{`${c.point.label}: ${c.point.value}%`}</title>
          </circle>
        ))}
      </svg>
      <div className="cs-linechart-labels">
        {points.map((p, idx) => (
          <span key={idx} className="cs-linechart-label">{p.label}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Heatmap (Attendance Intensity by Day / Period) ───────────────────────────
export function Heatmap({
  data,
}: {
  data: { day: string; periods: number[] }[];
}) {
  const getColor = (val: number) => {
    if (val >= 90) return 'var(--tier-auto)';
    if (val >= 75) return '#6ee7b7';
    if (val >= 60) return 'var(--tier-review)';
    return 'var(--tier-absent)';
  };

  return (
    <div className="cs-heatmap-container">
      <div className="cs-heatmap-grid">
        {data.map((row, rIdx) => (
          <div key={rIdx} className="cs-heatmap-row">
            <span className="cs-heatmap-day-label">{row.day}</span>
            <div className="cs-heatmap-cells">
              {row.periods.map((val, pIdx) => (
                <div
                  key={pIdx}
                  className="cs-heatmap-cell"
                  style={{ backgroundColor: getColor(val) }}
                  title={`${row.day} Period ${pIdx + 1}: ${val}% attendance`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="cs-heatmap-legend">
        <span>Less than 60%</span>
        <div className="cs-legend-swatches">
          <span style={{ background: 'var(--tier-absent)' }} />
          <span style={{ background: 'var(--tier-review)' }} />
          <span style={{ background: '#6ee7b7)' }} />
          <span style={{ background: 'var(--tier-auto)' }} />
        </div>
        <span>90%+</span>
      </div>
    </div>
  );
}

// ─── SeatMap (Classroom Layout with Absentee Heat) ────────────────────────────
export interface Seat {
  id: string;
  row: number;
  col: number;
  studentName?: string;
  status: 'AUTO' | 'REVIEW' | 'UNKNOWN' | 'ABSENT' | 'EMPTY';
}

export function SeatMap({
  rows = 4,
  cols = 6,
  seats,
  onSeatClick,
}: {
  rows?: number;
  cols?: number;
  seats: Seat[];
  onSeatClick?: (seat: Seat) => void;
}) {
  const getSeatColor = (status: Seat['status']) => {
    switch (status) {
      case 'AUTO': return 'var(--tier-auto-bg)';
      case 'REVIEW': return 'var(--tier-review-bg)';
      case 'UNKNOWN': return 'var(--tier-unknown-bg)';
      case 'ABSENT': return 'var(--tier-absent-bg)';
      default: return 'var(--surface-raised)';
    }
  };

  const getBorderColor = (status: Seat['status']) => {
    switch (status) {
      case 'AUTO': return 'var(--tier-auto-border)';
      case 'REVIEW': return 'var(--tier-review-border)';
      case 'UNKNOWN': return 'var(--tier-unknown-border)';
      case 'ABSENT': return 'var(--tier-absent-border)';
      default: return 'var(--line)';
    }
  };

  return (
    <div className="cs-seatmap-container">
      <div className="cs-seatmap-front-board">
        <span>Front / Lecturer Podium & Camera Direction</span>
      </div>
      <div
        className="cs-seatmap-grid"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(44px, 1fr))`,
        }}
      >
        {seats.map((seat) => (
          <button
            key={seat.id}
            type="button"
            className="cs-seat"
            style={{
              backgroundColor: getSeatColor(seat.status),
              borderColor: getBorderColor(seat.status),
            }}
            onClick={() => onSeatClick?.(seat)}
            title={seat.studentName ? `${seat.studentName} (${seat.status})` : `Seat ${seat.id}`}
          >
            <span className="cs-seat-id">{seat.id}</span>
            {seat.studentName && <span className="cs-seat-student">{seat.studentName.slice(0, 3)}</span>}
          </button>
        ))}
      </div>
      <div className="cs-seatmap-legend">
        <span><span className="legend-dot auto" /> Present (AUTO)</span>
        <span><span className="legend-dot review" /> Review</span>
        <span><span className="legend-dot absent" /> Absent</span>
        <span><span className="legend-dot empty" /> Empty</span>
      </div>
    </div>
  );
}

