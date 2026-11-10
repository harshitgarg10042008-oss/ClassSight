'use client';

import React, { useRef } from 'react';

export interface TabItem {
  id: string;
  label: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

export interface TabNavProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
  className?: string;
}

export function TabNav({
  items,
  activeId,
  onChange,
  ariaLabel = 'Navigation Tabs',
  className = '',
}: TabNavProps) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const count = items.length;
    let nextIndex = index;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextIndex = (index + 1) % count;
      while (items[nextIndex]?.disabled && nextIndex !== index) {
        nextIndex = (nextIndex + 1) % count;
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      nextIndex = (index - 1 + count) % count;
      while (items[nextIndex]?.disabled && nextIndex !== index) {
        nextIndex = (nextIndex - 1 + count) % count;
      }
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextIndex = 0;
      while (items[nextIndex]?.disabled && nextIndex < count - 1) {
        nextIndex++;
      }
    } else if (e.key === 'End') {
      e.preventDefault();
      nextIndex = count - 1;
      while (items[nextIndex]?.disabled && nextIndex > 0) {
        nextIndex--;
      }
    } else {
      return;
    }

    if (!items[nextIndex]?.disabled) {
      tabRefs.current[nextIndex]?.focus();
      onChange(items[nextIndex].id);
    }
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`cs-tab-nav inner-tabs ${className}`}
    >
      {items.map((item, idx) => {
        const isActive = activeId === item.id;
        return (
          <button
            key={item.id}
            ref={(el) => { tabRefs.current[idx] = el; }}
            role="tab"
            type="button"
            id={`tab-${item.id}`}
            aria-controls={`panel-${item.id}`}
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            disabled={item.disabled}
            className={`cs-tab-btn inner-tab ${isActive ? 'is-active active' : ''}`}
            onClick={() => onChange(item.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
          >
            <span className="cs-tab-label">{item.label}</span>
            {item.badge !== undefined && (
              <span className={`cs-tab-badge ${isActive ? 'is-active' : ''}`}>
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

