'use client';

import { useRouter } from 'next/navigation';

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="login-shell">
      <div className="login-card">
        <h1>Access Denied</h1>
        <p>You don't have permission to access this page.</p>
        <button onClick={() => router.push('/login')} className="login-btn">
          Return to Login
        </button>
      </div>
    </div>
  );
}
