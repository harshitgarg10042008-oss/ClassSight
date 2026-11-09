'use client';

import React, { useState, useMemo } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  width?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchFilter?: (row: T, query: string) => boolean;
  pageSize?: number;
  selectable?: boolean;
  onSelectionChange?: (selectedIds: (string | number)[]) => void;
  bulkActions?: React.ReactNode;
  loading?: boolean;
  error?: string;
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyField,
  searchable = true,
  searchPlaceholder = 'Search records...',
  searchFilter,
  pageSize = 10,
  selectable = false,
  onSelectionChange,
  bulkActions,
  loading = false,
  error,
  emptyMessage = 'No records found.',
  className = '',
}: DataTableProps<T>) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string | number>>(new Set());

  // Search filter
  const filtered = useMemo(() => {
    if (!query.trim()) return data;
    const q = query.toLowerCase();
    if (searchFilter) {
      return data.filter((row) => searchFilter(row, q));
    }
    return data.filter((row) =>
      Object.values(row).some((val) =>
        val !== null && val !== undefined && String(val).toLowerCase().includes(q)
      )
    );
  }, [data, query, searchFilter]);

  // Sort
  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      const res = aVal < bVal ? -1 : 1;
      return sortDir === 'asc' ? res : -res;
    });
  }, [filtered, sortKey, sortDir]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, currentPage, pageSize]);

  // Selection
  const allOnPageSelected = pageData.length > 0 && pageData.every((r) => selected.has(r[keyField]));

  const toggleSelectAllPage = () => {
    const next = new Set(selected);
    if (allOnPageSelected) {
      pageData.forEach((r) => next.delete(r[keyField]));
    } else {
      pageData.forEach((r) => next.add(r[keyField]));
    }
    setSelected(next);
    onSelectionChange?.(Array.from(next));
  };

  const toggleSelectRow = (id: string | number) => {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelected(next);
    onSelectionChange?.(Array.from(next));
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else {
        setSortKey(null);
        setSortDir('asc');
      }
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return (
    <div className={`cs-datatable-container ${className}`}>
      {/* Table Toolbar */}
      <div className="cs-datatable-toolbar">
        {searchable && (
          <div className="cs-datatable-search">
            <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              placeholder={searchPlaceholder}
              aria-label="Filter records"
              className="cs-datatable-search-input"
            />
            {query && (
              <button
                type="button"
                className="cs-datatable-clear-btn"
                onClick={() => { setQuery(''); setPage(1); }}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {selectable && selected.size > 0 && (
          <div className="cs-datatable-bulk-bar">
            <span className="cs-datatable-selected-count">
              {selected.size} selected
            </span>
            {bulkActions}
            <button
              type="button"
              className="cs-button button-ghost button-sm"
              onClick={() => {
                setSelected(new Set());
                onSelectionChange?.([]);
              }}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Table Element */}
      <div className="cs-datatable-scroll">
        <table className="cs-datatable">
          <thead>
            <tr>
              {selectable && (
                <th style={{ width: '40px' }} className="cs-th-checkbox">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleSelectAllPage}
                    aria-label="Select all rows on current page"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  className={col.sortable ? 'is-sortable' : ''}
                >
                  <div className="cs-th-content">
                    <span>{col.header}</span>
                    {col.sortable && (
                      <span className="cs-sort-indicator" aria-hidden="true">
                        {sortKey === col.key ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="cs-datatable-state-cell">
                  <div className="cs-loading-indicator">
                    <svg className="cs-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                    </svg>
                    <span>Loading data...</span>
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="cs-datatable-state-cell is-error">
                  <p>{error}</p>
                </td>
              </tr>
            ) : pageData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="cs-datatable-state-cell">
                  <p className="cs-empty-text">{emptyMessage}</p>
                </td>
              </tr>
            ) : (
              pageData.map((row) => {
                const id = row[keyField];
                const isChecked = selected.has(id);
                return (
                  <tr key={String(id)} className={isChecked ? 'is-selected' : ''}>
                    {selectable && (
                      <td className="cs-td-checkbox">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectRow(id)}
                          aria-label={`Select row ${id}`}
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key}>
                        {col.render ? col.render(row) : row[col.key]}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!loading && !error && sorted.length > pageSize && (
        <div className="cs-datatable-pagination">
          <span className="cs-pagination-info">
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, sorted.length)} of {sorted.length} entries
          </span>
          <div className="cs-pagination-controls">
            <button
              type="button"
              className="cs-button button-ghost button-sm"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <span className="cs-page-indicator">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              className="cs-button button-ghost button-sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

