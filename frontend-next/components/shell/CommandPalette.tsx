'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '../AppContext';
import {
  DashboardIcon,
  TodayIcon,
  CameraIcon,
  ReviewIcon,
  SessionsIcon,
  ClassesIcon,
  EnrollIcon,
  StudentsIcon,
  TimetableIcon,
  CamerasIcon,
  AnalyticsIcon,
  ReportsIcon,
  RiskIcon,
  LeaveIcon,
  DisputesIcon,
  BellIcon,
  SettingsIcon,
  HelpIcon,
  SearchIcon,
  CloseIcon,
} from '../ui/Icons';

interface PaletteItem {
  id: string;
  category: 'Navigation' | 'Actions';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  onSelect: () => void;
}

export function CommandPalette() {
  const router = useRouter();
  const { commandPaletteOpen, setCommandPaletteOpen, toggleLanguage, language } = useApp();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [commandPaletteOpen]);

  const items: PaletteItem[] = [
    // Navigation
    {
      id: 'nav-dashboard',
      category: 'Navigation',
      title: 'Faculty Dashboard',
      subtitle: 'Overview, today’s classes, review queue summary',
      icon: <DashboardIcon size={18} />,
      onSelect: () => router.push('/app'),
    },
    {
      id: 'nav-today',
      category: 'Navigation',
      title: 'Today’s Schedule',
      subtitle: 'Current and upcoming periods, live capture windows',
      icon: <TodayIcon size={18} />,
      onSelect: () => router.push('/app/today'),
    },
    {
      id: 'nav-capture',
      category: 'Navigation',
      title: 'Take Attendance (Live Camera)',
      subtitle: 'Single and multi-shot classroom capture and AI matching',
      icon: <CameraIcon size={18} />,
      onSelect: () => router.push('/app/teacher'),
    },
    {
      id: 'nav-review',
      category: 'Navigation',
      title: 'Review Queue',
      subtitle: 'Sessions requiring faculty attendance confirmation',
      icon: <ReviewIcon size={18} />,
      onSelect: () => router.push('/app/review'),
    },
    {
      id: 'nav-sessions',
      category: 'Navigation',
      title: 'Attendance Sessions',
      subtitle: 'Past sessions, detection breakdown, absent lists',
      icon: <SessionsIcon size={18} />,
      onSelect: () => router.push('/app/sessions'),
    },
    {
      id: 'nav-classes',
      category: 'Navigation',
      title: 'Classes & Sections',
      subtitle: 'Assigned courses, roster breakdown, attendance trends',
      icon: <ClassesIcon size={18} />,
      onSelect: () => router.push('/app/classes'),
    },
    {
      id: 'nav-enrollment',
      category: 'Navigation',
      title: 'Student Biometrics Enrollment',
      subtitle: 'Face enrollment, 128-d embeddings, bulk CSV+ZIP',
      icon: <EnrollIcon size={18} />,
      onSelect: () => router.push('/app/enrollment'),
    },
    {
      id: 'nav-students',
      category: 'Navigation',
      title: 'Student Directory',
      subtitle: 'Full student roster, consent status, attendance history',
      icon: <StudentsIcon size={18} />,
      onSelect: () => router.push('/app/students'),
    },
    {
      id: 'nav-timetable',
      category: 'Navigation',
      title: 'Timetable Schedule',
      subtitle: 'Weekly schedule grid, period slots, CSV import template',
      icon: <TimetableIcon size={18} />,
      onSelect: () => router.push('/app/timetable'),
    },
    {
      id: 'nav-cameras',
      category: 'Navigation',
      title: 'Room Cameras',
      subtitle: 'RTSP video feeds, resolution, health status, ping',
      icon: <CamerasIcon size={18} />,
      onSelect: () => router.push('/app/cameras'),
    },
    {
      id: 'nav-analytics',
      category: 'Navigation',
      title: 'Attendance Analytics',
      subtitle: 'Overview charts, student attendance bars, weekly heatmap',
      icon: <AnalyticsIcon size={18} />,
      onSelect: () => router.push('/app/analytics'),
    },
    {
      id: 'nav-reports',
      category: 'Navigation',
      title: 'Reports & Defaulters',
      subtitle: 'Official attendance registers, shortfall reports, PDF/Excel',
      icon: <ReportsIcon size={18} />,
      onSelect: () => router.push('/app/reports'),
    },
    {
      id: 'nav-risk',
      category: 'Navigation',
      title: 'Risk Radar (D10)',
      subtitle: 'Predictive shortfall warnings for students below 75%',
      icon: <RiskIcon size={18} />,
      onSelect: () => router.push('/app/risk'),
    },
    {
      id: 'nav-leave',
      category: 'Navigation',
      title: 'Leave & Condonation (D15)',
      subtitle: 'Student medical and duty leaves awaiting faculty approval',
      icon: <LeaveIcon size={18} />,
      onSelect: () => router.push('/app/leave'),
    },
    {
      id: 'nav-disputes',
      category: 'Navigation',
      title: 'Attendance Disputes (D16)',
      subtitle: 'Contested student attendance and HOD resolution notes',
      icon: <DisputesIcon size={18} />,
      onSelect: () => router.push('/app/disputes'),
    },
    {
      id: 'nav-notifications',
      category: 'Navigation',
      title: 'Notifications Centre',
      subtitle: 'System alerts, session reviews, leave requests',
      icon: <BellIcon size={18} />,
      onSelect: () => router.push('/app/notifications'),
    },
    {
      id: 'nav-settings',
      category: 'Navigation',
      title: 'Faculty Settings',
      subtitle: 'Profile, security, appearance, language, accessibility',
      icon: <SettingsIcon size={18} />,
      onSelect: () => router.push('/app/settings'),
    },
    {
      id: 'nav-help',
      category: 'Navigation',
      title: 'Help & Shortcuts',
      subtitle: 'Keyboard shortcuts, documentation, faculty support',
      icon: <HelpIcon size={18} />,
      onSelect: () => router.push('/app/help'),
    },

    // Actions
    {
      id: 'act-capture-now',
      category: 'Actions',
      title: 'Start Live Camera Capture',
      subtitle: 'Open camera HUD to take attendance for active class',
      icon: <CameraIcon size={18} />,
      onSelect: () => router.push('/app/teacher'),
    },
    {
      id: 'act-enrol-now',
      category: 'Actions',
      title: 'Enrol Student Biometrics',
      subtitle: 'Register 128-d FaceNet embedding for student',
      icon: <EnrollIcon size={18} />,
      onSelect: () => router.push('/app/enrollment'),
    },
    {
      id: 'act-toggle-lang',
      category: 'Actions',
      title: `Switch Language to ${language === 'en' ? 'हिन्दी (Hindi)' : 'English'}`,
      subtitle: 'Toggle UI language preference (partial localized)',
      icon: <SearchIcon size={18} />,
      onSelect: () => toggleLanguage(),
    },
    {
      id: 'act-export-analytics',
      category: 'Actions',
      title: 'Export Attendance Data (Excel / PDF)',
      subtitle: 'Download attendance reports for your assignments',
      icon: <AnalyticsIcon size={18} />,
      onSelect: () => router.push('/app/analytics'),
    },
  ];

  const filtered = items.filter((item) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
      item.category.toLowerCase().includes(q)
    );
  });

  function handleSelect(index: number) {
    const item = filtered[index];
    if (item) {
      setCommandPaletteOpen(false);
      item.onSelect();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect(selectedIndex);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setCommandPaletteOpen(false);
    }
  }

  if (!commandPaletteOpen) return null;

  return (
    <div
      className="cs-palette-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cs-palette-title"
      onClick={() => setCommandPaletteOpen(false)}
    >
      <div
        className="cs-palette-modal"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="cs-palette-header">
          <span className="cs-palette-search-icon" aria-hidden="true">
            <SearchIcon size={18} />
          </span>
          <input
            ref={inputRef}
            id="cs-palette-title"
            type="text"
            className="cs-palette-input"
            placeholder="Type a command, page, or action... (↑↓ to navigate, ↵ to select)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <button
            type="button"
            className="cs-palette-close-btn"
            onClick={() => setCommandPaletteOpen(false)}
            aria-label="Close command palette"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        <div className="cs-palette-results" role="listbox">
          {filtered.length === 0 ? (
            <div className="cs-palette-empty">
              No matching pages or actions found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  role="option"
                  aria-selected={isSelected}
                  className={`cs-palette-item ${isSelected ? 'is-selected' : ''}`}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => handleSelect(idx)}
                >
                  <div className="cs-palette-item-icon">{item.icon}</div>
                  <div className="cs-palette-item-info">
                    <div className="cs-palette-item-title">
                      {item.title}
                      <span className="cs-palette-item-cat">{item.category}</span>
                    </div>
                    {item.subtitle && (
                      <div className="cs-palette-item-sub">{item.subtitle}</div>
                    )}
                  </div>
                  {isSelected && (
                    <span className="cs-palette-item-enter" aria-hidden="true">
                      ↵
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="cs-palette-footer">
          <div className="cs-palette-shortcut-hints">
            <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
            <span><kbd>↵</kbd> select</span>
            <span><kbd>Esc</kbd> close</span>
          </div>
          <div className="cs-palette-tag">ClassSight Faculty Workspace</div>
        </div>
      </div>
    </div>
  );
}
