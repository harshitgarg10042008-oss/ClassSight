'use client';

import { useState } from 'react';

export function CookieBanner() {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  return <aside className="cookie-banner" role="dialog" aria-label="Cookie notice">
    <p>ClassSight uses essential browser storage for session and consent preferences. No advertising cookies are used.</p>
    <button className="button button-primary" onClick={() => setVisible(false)}>Understand</button>
  </aside>;
}
