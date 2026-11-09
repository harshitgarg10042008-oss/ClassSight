'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PublicShell } from '@/components/shell/PublicShell';
import { Accordion } from '@/components/ui';
import { plans, planLabel } from '@/lib/plans';
import { featureRegistry } from '@/config/features';

export default function PricingPage() {
  const [filterCategory, setFilterCategory] = useState<'ALL' | 'CORE' | 'SIGNATURE'>('ALL');

  const filteredFeatures = featureRegistry.filter((f) => {
    if (filterCategory === 'CORE') return f.id.startsWith('FT');
    if (filterCategory === 'SIGNATURE') return f.id.startsWith('D');
    return true;
  });

  const checkAvailability = (featurePlan: string, columnPlan: string) => {
    const ranks = { essential: 1, pro: 2, advanced: 3 };
    const fRank = ranks[featurePlan as keyof typeof ranks] || 1;
    const cRank = ranks[columnPlan as keyof typeof ranks] || 1;
    return cRank >= fRank;
  };

  return (
    <PublicShell>
      <main id="main-content" className="cs-app-content" style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 24px' }}>
        <header style={{ textAlign: 'center', marginBottom: '48px' }}>
          <span className="cs-eyebrow">Predictable Institutional Licensing</span>
          <h1 className="cs-page-title" style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', margin: '8px 0 16px' }}>
            Plans shaped for your rollout.
          </h1>
          <p style={{ maxWidth: '640px', margin: '0 auto', color: 'var(--text-muted)', fontSize: '16px' }}>
            Prices and limits are intentionally unmetered in public previews. Our team configures campus-wide
            or department-specific licensing tailored to your active student count and deployment model.
          </p>
        </header>

        {/* ── PLAN CARDS ─────────────────────────────────────────── */}
        <div className="cs-pricing-cards-grid" style={{ marginBottom: '64px' }}>
          {plans.map((p) => {
            const isPro = p.id === 'pro';
            return (
              <div
                key={p.id}
                className={`cs-plan-card ${isPro ? 'is-featured' : ''}`}
                style={{
                  border: isPro ? '2px solid var(--lagoon-600)' : '1px solid var(--line)',
                  borderRadius: 'var(--radius)',
                  padding: '32px 24px',
                  backgroundColor: 'var(--surface)',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                }}
              >
                {isPro && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-12px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: 'var(--lagoon-600)',
                      color: 'white',
                      padding: '2px 12px',
                      borderRadius: '999px',
                      fontSize: '11px',
                      fontWeight: '700',
                      letterSpacing: '0.05em',
                    }}
                  >
                    RECOMMENDED
                  </span>
                )}
                <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 8px' }}>{p.name}</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', minHeight: '40px', margin: '0 0 20px' }}>
                  {p.description}
                </p>
                <div style={{ padding: '16px 0', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', marginBottom: '24px' }}>
                  <span style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text)' }}>
                    {planLabel(p)}
                  </span>
                  <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Custom quote based on active classroom seats
                  </span>
                </div>

                <div style={{ flex: 1, marginBottom: '24px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Key Capabilities:
                  </span>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0 0', display: 'grid', gap: '10px', fontSize: '13px' }}>
                    {p.id === 'essential' && (
                      <>
                        <li>✓ Single-shot classroom capture</li>
                        <li>✓ Group-photo roster enrolment</li>
                        <li>✓ Faculty speed review interface</li>
                        <li>✓ Room & camera assignment</li>
                        <li>✓ Standard absent CSV export</li>
                      </>
                    )}
                    {p.id === 'pro' && (
                      <>
                        <li>✓ Everything in Essential, plus:</li>
                        <li>✓ Multi-shot burst accumulator</li>
                        <li>✓ Early-warning risk radar</li>
                        <li>✓ Classroom seat-map heat view</li>
                        <li>✓ Automated camera health monitor</li>
                      </>
                    )}
                    {p.id === 'advanced' && (
                      <>
                        <li>✓ Everything in Pro, plus:</li>
                        <li>✓ Bidirectional ERP/LMS integrations</li>
                        <li>✓ Student & parent self-service portal</li>
                        <li>✓ Multi-campus single sign-on (SSO)</li>
                        <li>✓ Dedicated private cloud / on-premise cluster</li>
                      </>
                    )}
                  </ul>
                </div>

                <Link
                  href="/book-demo"
                  className={`cs-button ${isPro ? 'button-primary' : 'button-outline'} button-wide`}
                >
                  Request Institutional Quote
                </Link>
              </div>
            );
          })}
        </div>

        {/* ── FULL FEATURE COMPARISON TABLE (FT01-FT20 & D01-D24) ─── */}
        <section style={{ marginBottom: '64px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <span className="cs-eyebrow">Comprehensive Entitlements Matrix</span>
              <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '4px 0 0' }}>
                Compare all 44 capabilities
              </h2>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className={`cs-button ${filterCategory === 'ALL' ? 'button-primary' : 'button-secondary'} button-sm`}
                onClick={() => setFilterCategory('ALL')}
              >
                All (44)
              </button>
              <button
                type="button"
                className={`cs-button ${filterCategory === 'CORE' ? 'button-primary' : 'button-secondary'} button-sm`}
                onClick={() => setFilterCategory('CORE')}
              >
                Core FT01–FT20
              </button>
              <button
                type="button"
                className={`cs-button ${filterCategory === 'SIGNATURE' ? 'button-primary' : 'button-secondary'} button-sm`}
                onClick={() => setFilterCategory('SIGNATURE')}
              >
                Signature D01–D24
              </button>
            </div>
          </div>

          <div className="cs-datatable-container">
            <div className="cs-datatable-scroll">
              <table className="cs-datatable">
                <thead>
                  <tr>
                    <th style={{ width: '90px' }}>ID</th>
                    <th>Capability Name</th>
                    <th style={{ width: '130px' }}>Module</th>
                    <th style={{ width: '110px', textAlign: 'center' }}>Essential</th>
                    <th style={{ width: '110px', textAlign: 'center' }}>Pro</th>
                    <th style={{ width: '110px', textAlign: 'center' }}>Advanced</th>
                    <th style={{ width: '120px', textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFeatures.map((f) => (
                    <tr key={f.id}>
                      <td style={{ fontWeight: '700', fontFamily: 'monospace' }}>{f.id}</td>
                      <td>
                        <strong>{f.name}</strong>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{f.module}</td>
                      <td style={{ textAlign: 'center' }}>
                        {checkAvailability(f.plan, 'essential') ? (
                          <span style={{ color: 'var(--tier-auto)', fontWeight: '700' }}>✓</span>
                        ) : (
                          <span style={{ color: 'var(--line-strong)' }}>—</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {checkAvailability(f.plan, 'pro') ? (
                          <span style={{ color: 'var(--tier-auto)', fontWeight: '700' }}>✓</span>
                        ) : (
                          <span style={{ color: 'var(--line-strong)' }}>—</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {checkAvailability(f.plan, 'advanced') ? (
                          <span style={{ color: 'var(--tier-auto)', fontWeight: '700' }}>✓</span>
                        ) : (
                          <span style={{ color: 'var(--line-strong)' }}>—</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span
                          className="cs-status-tag"
                          style={{
                            backgroundColor: f.status === 'WIRED' ? '#DCFCE7' : f.status === 'COMING-SOON' ? '#F1F5F9' : '#FEF3C7',
                            color: f.status === 'WIRED' ? '#14532D' : f.status === 'COMING-SOON' ? '#334155' : '#78350F',
                          }}
                        >
                          {f.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────────────────── */}
        <section style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '800', textAlign: 'center', marginBottom: '24px' }}>
            Frequently Asked Pricing Questions
          </h2>
          <Accordion
            items={[
              {
                id: 'pq-1',
                title: 'How is pricing calculated?',
                content: 'Pricing is based on active enrolled student volume across registered departments, rather than per-camera or per-faculty fees. This ensures unlimited class captures without surprise usage spikes.',
              },
              {
                id: 'pq-2',
                title: 'Can we pilot ClassSight in a single department first?',
                content: 'Yes. Most universities start with our Essential or Pro pilot covering 2–3 departments for one academic semester before institution-wide rollout.',
              },
              {
                id: 'pq-3',
                title: 'Is on-premise deployment available for data sovereignty?',
                content: 'Yes, on-premise air-gapped Docker Compose and Kubernetes deployments are available under the Advanced plan for institutions requiring strict local data residency.',
              },
            ]}
          />
        </section>
      </main>
    </PublicShell>
  );
}
