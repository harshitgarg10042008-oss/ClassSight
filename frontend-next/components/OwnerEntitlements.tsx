'use client';

import { useState } from 'react';
import { features } from '@/lib/features';
import { plans } from '@/lib/plans';

export function OwnerEntitlements() {
  const [copied, setCopied] = useState(false);
  const config = JSON.stringify({ plans, features }, null, 2);
  return <section className="section-card"><div className="section-head"><div><span className="eyebrow">Source of truth</span><h2>Entitlement matrix</h2></div><button className="button button-outline" onClick={() => { navigator.clipboard.writeText(config).then(() => setCopied(true)); }}>{copied ? 'Copied' : 'Copy config'}</button></div><p className="muted">Editing the configuration files changes entitlements everywhere. This button copies a parseable snapshot.</p><div className="feature-table">{features.map((feature) => <div className="feature-row" key={feature.id}><span>{feature.id}</span><strong>{feature.name}</strong>{plans.map((plan) => <span className={plan.id === feature.defaultPlan ? 'badge' : ''} key={plan.id}>{plan.id === feature.defaultPlan ? 'Included' : '—'}</span>)}</div>)}</div></section>;
}
