'use client';

import React from 'react';

export interface StatCardProps {
  title: string;
  value: string | number;
  delta?: { value: string; positive?: boolean; neutral?: boolean };
  sparklineData?: number[];
  hint?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function StatCard({
  title,
  value,
  delta,
  sparklineData,
  hint,
  icon,
  className = '',
}: StatCardProps) {
  // Generate SVG path from sparklineData
  let sparklinePath = '';
  if (sparklineData && sparklineData.length > 1) {
    const min = Math.min(...sparklineData);
    const max = Math.max(...sparklineData);
    const range = max - min || 1;
    const width = 100;
    const height = 28;

    const points = sparklineData.map((val, idx) => {
      const x = (idx / (sparklineData.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    sparklinePath = `M ${points.join(' L ')}`;
  }

  return (
    <div className={`cs-stat-card ${className}`}>
      <div className="cs-stat-header">
        <span className="cs-stat-title">{title}</span>
        {icon && <span className="cs-stat-icon">{icon}</span>}
      </div>
      <div className="cs-stat-body">
        <span className="cs-stat-value tabular-nums">{value}</span>
        {sparklinePath && (
          <div className="cs-stat-sparkline" aria-hidden="true">
            <svg viewBox="0 0 100 28" preserveAspectRatio="none">
              <path
                d={sparklinePath}
                fill="none"
                stroke="var(--lagoon-600)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
      </div>
      {(delta || hint) && (
        <div className="cs-stat-footer">
          {delta && (
            <span
              className={`cs-stat-delta ${
                delta.neutral ? 'is-neutral' : delta.positive ? 'is-positive' : 'is-negative'
              }`}
            >
              {delta.positive ? '↑' : delta.neutral ? '→' : '↓'} {delta.value}
            </span>
          )}
          {hint && <span className="cs-stat-hint">{hint}</span>}
        </div>
      )}
    </div>
  );
}
