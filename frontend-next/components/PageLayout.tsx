'use client';

import React from 'react';
import { AppShell } from './shell/AppShell';
import { Crumb } from './ui/NavigationAndFeedback';

export interface PageLayoutProps {
  pageId?: string;
  title?: string;
  crumbs?: Crumb[];
  actions?: React.ReactNode;
  isSampleData?: boolean;
  children: React.ReactNode;
}

export function PageLayout({
  pageId,
  title,
  crumbs,
  actions,
  isSampleData = false,
  children,
}: PageLayoutProps) {
  // If no title is given, derive from pageId
  const displayTitle =
    title ||
    (pageId
      ? pageId.charAt(0).toUpperCase() + pageId.slice(1).replace('-', ' ')
      : undefined);

  return (
    <AppShell
      title={displayTitle}
      crumbs={crumbs}
      actions={actions}
      isSampleData={isSampleData}
    >
      {children}
    </AppShell>
  );
}
