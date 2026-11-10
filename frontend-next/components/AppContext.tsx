'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  type: 'review' | 'timetable' | 'leave' | 'camera' | 'system';
  link?: string;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n-1',
    title: 'Session #21 requires faculty review',
    description: 'Mathematics I (CS-2026-A) has 3 ambiguous face detections awaiting sign-off.',
    timestamp: '12m ago',
    read: false,
    type: 'review',
    link: '/app/review',
  },
  {
    id: 'n-2',
    title: 'Timetable window opening soon',
    description: 'Upcoming class CS201 Data Structures in Room 102 starts at 11:00 AM.',
    timestamp: '45m ago',
    read: false,
    type: 'timetable',
    link: '/app/today',
  },
  {
    id: 'n-3',
    title: 'Medical leave request submitted',
    description: 'Aarav Patel (CS-101) requested 2 days condonation for viral fever.',
    timestamp: '2h ago',
    read: false,
    type: 'leave',
    link: '/app/leave',
  },
  {
    id: 'n-4',
    title: 'Camera Room 101 status online',
    description: 'RTSP camera heartbeat verified at 1080p 30fps (ping 12ms).',
    timestamp: 'Yesterday',
    read: true,
    type: 'camera',
    link: '/app/cameras',
  },
];

export interface AppContextType {
  selectedClassId: number | null;
  setSelectedClassId: (id: number | null) => void;
  selectedSubjectId: number | null;
  setSelectedSubjectId: (id: number | null) => void;
  selectedAssignmentId: number | null;
  setSelectedAssignmentId: (id: number | null) => void;
  language: 'en' | 'hi';
  setLanguage: (lang: 'en' | 'hi') => void;
  toggleLanguage: () => void;
  user: { fullName: string; role: string; username: string };
  setUser: React.Dispatch<React.SetStateAction<{ fullName: string; role: string; username: string }>>;
  notifications: NotificationItem[];
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  unreadCount: number;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  isDev: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [selectedClassId, setSelectedClassIdState] = useState<number | null>(null);
  const [selectedSubjectId, setSelectedSubjectIdState] = useState<number | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentIdState] = useState<number | null>(null);
  const [language, setLanguageState] = useState<'en' | 'hi'>('en');
  const [user, setUser] = useState<{ fullName: string; role: string; username: string }>({
    fullName: 'Dr. R. Sharma',
    role: 'TEACHER',
    username: 'teacher',
  });
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const isDev = process.env.NODE_ENV === 'development';

  // Hydrate from localStorage safely
  useEffect(() => {
    try {
      const storedAss = window.localStorage.getItem('classsight_selected_assignment');
      if (storedAss) setSelectedAssignmentIdState(Number(storedAss));

      const storedClass = window.localStorage.getItem('classsight_selected_class');
      if (storedClass) setSelectedClassIdState(Number(storedClass));

      const storedSub = window.localStorage.getItem('classsight_selected_subject');
      if (storedSub) setSelectedSubjectIdState(Number(storedSub));

      const storedLang = window.localStorage.getItem('classsight_lang');
      if (storedLang === 'hi' || storedLang === 'en') setLanguageState(storedLang);

      const storedName = window.localStorage.getItem('classsight_full_name');
      const storedRole = window.localStorage.getItem('classsight_role');
      const storedUser = window.localStorage.getItem('classsight_username');
      if (storedName || storedRole || storedUser) {
        setUser({
          fullName: storedName || 'Dr. R. Sharma',
          role: storedRole || 'TEACHER',
          username: storedUser || 'teacher',
        });
      }
    } catch {
      /* storage is optional */
    }
  }, []);

  function setSelectedAssignmentId(id: number | null) {
    setSelectedAssignmentIdState(id);
    try {
      if (id !== null) {
        window.localStorage.setItem('classsight_selected_assignment', String(id));
      } else {
        window.localStorage.removeItem('classsight_selected_assignment');
      }
    } catch {
      /* optional */
    }
  }

  function setSelectedClassId(id: number | null) {
    setSelectedClassIdState(id);
    try {
      if (id !== null) {
        window.localStorage.setItem('classsight_selected_class', String(id));
      } else {
        window.localStorage.removeItem('classsight_selected_class');
      }
    } catch {
      /* optional */
    }
  }

  function setSelectedSubjectId(id: number | null) {
    setSelectedSubjectIdState(id);
    try {
      if (id !== null) {
        window.localStorage.setItem('classsight_selected_subject', String(id));
      } else {
        window.localStorage.removeItem('classsight_selected_subject');
      }
    } catch {
      /* optional */
    }
  }

  function setLanguage(lang: 'en' | 'hi') {
    setLanguageState(lang);
    try {
      window.localStorage.setItem('classsight_lang', lang);
    } catch {
      /* optional */
    }
  }

  function toggleLanguage() {
    setLanguage(language === 'en' ? 'hi' : 'en');
  }

  function markNotificationRead(id: string) {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
  }

  function markAllNotificationsRead() {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Keyboard shortcut for command palette (Ctrl+K or Cmd+K) and Escape to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <AppContext.Provider
      value={{
        selectedClassId,
        setSelectedClassId,
        selectedSubjectId,
        setSelectedSubjectId,
        selectedAssignmentId,
        setSelectedAssignmentId,
        language,
        setLanguage,
        toggleLanguage,
        user,
        setUser,
        notifications,
        markNotificationRead,
        markAllNotificationsRead,
        unreadCount,
        commandPaletteOpen,
        setCommandPaletteOpen,
        isDev,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

