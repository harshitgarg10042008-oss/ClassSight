import Link from 'next/link';
import { adminSections, ownerSections, tenantDetailSection, tenants, type SectionSpec } from '@/lib/workspace-admin';
import { portalSections, teacherSections } from '@/lib/workspace-teacher';
import { EligibilityCalculator } from './EligibilityCalculator';
import { EntitlementMatrix, FeatureFlags, RolesMatrix } from './Matrices';
import { WorkspaceTable } from './WorkspaceTable';
import { WorkspaceChrome } from '@/components/shell/WorkspaceChrome';
import { LockedFeature } from '@/components/LockedFeature';

export type WorkspaceId = 'admin' | 'owner' | 'teacher' | 'portal';

const areas: Record<WorkspaceId, { label: string; eyebrow: string; base: string; sections: SectionSpec[] }> = {
  admin: { label: 'Institution admin', eyebrow: 'Administration', base: '/admin', sections: adminSections },
  owner: { label: 'Platform owner', eyebrow: 'Owner console', base: '/owner', sections: ownerSections },
  teacher: { label: 'Faculty workspace', eyebrow: 'Faculty', base: '/app/teacher', sections: teacherSections },
  portal: { label: 'Student and parent portal', eyebrow: 'Portal', base: '/portal', sections: portalSections },
};

export function resolveSection(area: WorkspaceId, sectionId: string): SectionSpec | null {
  if (area === 'owner' && sectionId.startsWith('tenants/')) {
    return tenantDetailSection(sectionId.replace('tenants/', ''));
  }
  return areas[area].sections.find((item) => item.id === sectionId) ?? null;
}

export function workspaceNav(area: WorkspaceId, current: string) {
  const config = areas[area];
  const extra = area === 'owner'
    ? tenants.map((tenant) => ({ id: `tenants/${tenant.id}`, title: tenant.name, href: `/owner/tenants/${tenant.id}` }))
    : [];
  const primary = config.sections
    .filter((item) => item.id !== 'overview')
    .map((item) => ({ id: item.id, title: item.title, href: `${config.base}/${item.id}` }));
  return { home: config.base, primary: [...primary, ...extra], isCurrent: (id: string) => id === current };
}

export function WorkspacePage({ area, sectionId }: { area: WorkspaceId; sectionId: string }) {
  const config = areas[area];
  const spec = resolveSection(area, sectionId);
  if (!spec) return null;
  const nav = workspaceNav(area, sectionId);
  const isMatrixOnly = spec.id === 'entitlements';

  return (
    <main id="main-content" className="workspace-shell">
      <WorkspaceChrome />
      <header className="workspace-header">
        <div>
          <span className="eyebrow">{config.eyebrow}</span>
          <h1>{spec.title}</h1>
          <p className="page-subtitle">{spec.summary}</p>
        </div>
        <div className="workspace-header-meta">
          {spec.plan && <span className="badge badge-purple">{spec.plan} plan</span>}
          <span className="badge badge-blue">UI-PREVIEW</span>
        </div>
      </header>

      <div className="sample-banner" role="status">
        <strong>Preview</strong> Sample data, nothing was sent. Every name, count and state on this page is fictional.
      </div>

      <nav className="inner-tabs" aria-label={`${config.label} sections`}>
        <Link className={`inner-tab ${sectionId === 'overview' ? 'active' : ''}`} href={nav.home}>Overview</Link>
        {nav.primary.map((item) => (
          <Link key={item.id} className={`inner-tab ${item.id === sectionId ? 'active' : ''}`} href={item.href}>{item.title}</Link>
        ))}
      </nav>

      <div className="stats-grid">
        {spec.stats.map(([label, value, tone]) => (
          <div className={`stat-card ${tone ?? 'blue'}`} key={label}>
            <div className="stat-value">{value}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      {spec.extra === 'roles-matrix' && <RolesMatrix />}
      {spec.extra === 'entitlement-matrix' && <EntitlementMatrix interactive={area === 'owner'} />}
      {spec.extra === 'feature-flags' && <FeatureFlags />}
      {spec.extra === 'eligibility' && <EligibilityCalculator />}

      <WorkspaceTable spec={spec} hideRows={isMatrixOnly || spec.extra === 'feature-flags' || spec.extra === 'eligibility'} />

      {spec.plan && spec.plan !== 'Essential' && (
        <section className="section-card" aria-labelledby={`${spec.id}-plan-gate`}>
          <div className="section-head">
            <h2 id={`${spec.id}-plan-gate`}>Plan gate</h2>
            <span className="badge badge-purple">{spec.plan} plan</span>
          </div>
          <LockedFeature
            name={`Live ${spec.title.toLowerCase()}`}
            plan={spec.plan}
            description={`The live capability is gated to the ${spec.plan} plan. This preview stays visible so the information design can be reviewed; browsing does not unlock anything.`}
          />
        </section>
      )}

      <section className="section-card" aria-labelledby={`${spec.id}-boundaries`}>
        <div className="section-head"><h2 id={`${spec.id}-boundaries`}>What this page does not do</h2></div>
        <ul className="honesty-list">
          {spec.notes.map((note) => <li key={note}>{note}</li>)}
        </ul>
      </section>

      <p className="hint workspace-footer-note">
        <Link href={nav.home}>Back to {config.label.toLowerCase()}</Link> · <Link href="/app">Faculty workspace</Link> · <Link href="/">Product site</Link>
      </p>
    </main>
  );
}
