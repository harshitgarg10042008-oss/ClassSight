'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { SectionSpec } from '@/lib/workspace-admin';

export function WorkspaceTable({ spec, hideRows = false }: { spec: SectionSpec; hideRows?: boolean }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const filters = spec.filters ?? [];

  const rows = useMemo(() => {
    if (hideRows) return [];
    const needle = query.trim().toLowerCase();
    return spec.rows.filter((row) => {
      const matchesQuery = !needle || row.join(' ').toLowerCase().includes(needle);
      const matchesFilter = filter === 'All' || row.some((cell) => cell.toLowerCase().includes(filter.toLowerCase()));
      return matchesQuery && matchesFilter;
    });
  }, [filter, hideRows, query, spec.rows]);

  return (
    <section className="section-card" aria-labelledby={`${spec.id}-table`}>
      <div className="section-head">
        <div>
          <h2 id={`${spec.id}-table`}>{spec.title} table</h2>
          <p className="hint">Fictional sample rows. Filtering and searching happen in your browser.</p>
        </div>
        <span className="badge badge-gray">{rows.length} of {spec.rows.length} sample rows</span>
      </div>

      <div className="workspace-toolbar">
        <label className="workspace-search">
          <span className="sr-only">Search {spec.title}</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${spec.title.toLowerCase()}`} />
        </label>
        {filters.length > 0 && (
          <div className="filter-bar" role="group" aria-label={`${spec.title} filters`}>
            {filters.map((item) => (
              <button key={item} type="button" className={`filter-chip ${filter === item ? 'active' : ''}`}
                aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}</button>
            ))}
          </div>
        )}
      </div>

      {rows.length > 0 ? (
        <div className="table-wrap">
          <table>
            <caption className="sr-only">{spec.title} sample data</caption>
            <thead><tr>{spec.columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={`${spec.id}-row-${rowIndex}`}>
                  {row.map((cell, cellIndex) => (
                    <td key={`${spec.id}-${rowIndex}-${cellIndex}`}>
                      {cell.startsWith('/') ? <Link href={cell}>{cell}</Link> : cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state" role="status">
          <span className="empty-icon">∅</span>
          <strong>{spec.emptyTitle}</strong>
          <p>{spec.emptyBody}</p>
          {query || filter !== 'All' ? <button type="button" className="button button-outline" onClick={() => { setQuery(''); setFilter('All'); }}>Clear filters</button> : null}
        </div>
      )}

      <details className="state-preview">
        <summary>State previews for this table</summary>
        <div className="state-grid">
          <div className="state-card">
            <span className="eyebrow">Loading</span>
            <div className="skeleton-row" /><div className="skeleton-row" /><div className="skeleton-row" />
            <p className="hint">Shown while a workspace request is in flight.</p>
          </div>
          <div className="state-card">
            <span className="eyebrow">Empty</span>
            <p className="hint">{spec.emptyTitle} — {spec.emptyBody}</p>
          </div>
          <div className="state-card">
            <span className="eyebrow">Error</span>
            <p className="hint">If the request fails, the table keeps the last good rows and shows a retry action. Nothing is committed while an error is open.</p>
          </div>
        </div>
      </details>
    </section>
  );
}
