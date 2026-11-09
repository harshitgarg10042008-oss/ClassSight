'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AuthShell } from '@/components/shell/AuthShell';
import { Button } from '@/components/ui/Button';

export default function LogoutPage() {
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('classsight_full_name');
      localStorage.removeItem('classsight_role');
      setCleared(true);
    } catch {
      /* optional browser storage */
    }
  }, []);

  return (
    <AuthShell
      badge="Session Ended"
      title="You have signed out"
      subtitle="Your active classroom attendance session has been safely closed."
      footerLink={{
        text: 'Need to resume attendance?',
        href: '/login',
        actionText: 'Sign In Again',
      }}
    >
      <div style={{ textAlign: 'center', padding: '24px 0' }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>👋</div>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: '1.6' }}>
          Biometric credentials and faculty authentication tokens have been purged from this browser session.
        </p>

        <div style={{ display: 'grid', gap: '10px' }}>
          <Link href="/login" className="cs-button button-primary button-wide">
            Sign In Again
          </Link>
          <Link href="/" className="cs-button button-outline button-wide">
            Return to Homepage
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
