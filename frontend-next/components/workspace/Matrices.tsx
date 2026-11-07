import { features } from '@/lib/features';
import { plans } from '@/lib/plans';
import { hasFeature } from '@/lib/entitlements';

const capabilities = ['Capture attendance', 'Review and finalise', 'Enrol students', 'Edit timetable', 'Manage consent', 'View audit log'];

const roles: [role: string, granted: string[]][] = [
  ['Institution admin', ['Review and finalise', 'Enrol students', 'Edit timetable', 'Manage consent', 'View audit log']],
  ['HOD', ['Capture attendance', 'Review and finalise', 'Edit timetable', 'View audit log']],
  ['Faculty', ['Capture attendance', 'Review and finalise', 'Enrol students']],
  ['Student', []],
  ['Platform owner', ['View audit log']],
];

export function RolesMatrix() {
  return (
    <section className="section-card" aria-labelledby="roles-matrix">
      <div className="section-head">
        <div>
          <h2 id="roles-matrix">Role and capability matrix</h2>
          <p className="hint">Every capability below is checked by the API, not only hidden in the interface.</p>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <caption className="sr-only">Capabilities granted per role</caption>
          <thead>
            <tr><th scope="col">Role</th>{capabilities.map((capability) => <th key={capability} scope="col">{capability}</th>)}</tr>
          </thead>
          <tbody>
            {roles.map(([role, granted]) => (
              <tr key={role}>
                <th scope="row">{role}</th>
                {capabilities.map((capability) => (
                  <td key={`${role}-${capability}`}>{granted.includes(capability) ? <span className="badge badge-green">Allowed</span> : <span className="muted">—</span>}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="hint" style={{ marginTop: 12 }}>Students can read their own attendance and raise a dispute; they cannot capture or finalise.</p>
    </section>
  );
}

export function EntitlementMatrix({ interactive = false }: { interactive?: boolean }) {
  return (
    <section className="section-card" aria-labelledby="entitlement-matrix">
      <div className="section-head">
        <div>
          <h2 id="entitlement-matrix">Plan and entitlement matrix</h2>
          <p className="hint">Generated from the feature and plan configuration files. No price is published; every plan says “Contact us”.</p>
        </div>
        <span className="badge badge-blue">{features.length} features</span>
      </div>
      <div className="table-wrap">
        <table>
          <caption className="sr-only">Feature availability per plan</caption>
          <thead>
            <tr><th scope="col">Feature</th><th scope="col">Plan</th>{plans.map((plan) => <th key={plan.id} scope="col">{plan.name}</th>)}<th scope="col">Build status</th></tr>
          </thead>
          <tbody>
            {features.map((feature) => (
              <tr key={feature.id}>
                <th scope="row"><code>{feature.id}</code> {feature.name}</th>
                <td>{feature.defaultPlan}</td>
                {plans.map((plan) => (
                  <td key={`${feature.id}-${plan.id}`}>
                    {hasFeature(plan.id, feature) ? <span className="badge badge-green">Included</span> : <span className="muted">—</span>}
                  </td>
                ))}
                <td><span className={`badge ${feature.buildStatus === 'built' ? 'badge-green' : feature.buildStatus === 'in_progress' ? 'badge-amber' : 'badge-gray'}`}>{feature.buildStatus.replace('_', ' ')}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {interactive && <p className="hint" style={{ marginTop: 12 }}>Editing entitlements happens in the configuration files, not in this table.</p>}
    </section>
  );
}

export function FeatureFlags() {
  return (
    <section className="section-card" aria-labelledby="feature-flags">
      <div className="section-head">
        <div>
          <h2 id="feature-flags">Feature flags</h2>
          <p className="hint">Build-time state only. There is no runtime flag service, so the switches below are disabled on purpose.</p>
        </div>
        <span className="badge badge-red">Not runtime-editable</span>
      </div>
      <div className="flag-list">
        {features.map((feature) => (
          <label className="flag-row" key={feature.id}>
            <input type="checkbox" checked={feature.buildStatus === 'built'} disabled />
            <span><code>{feature.id}</code> {feature.name}</span>
            <span className={`badge ${feature.buildStatus === 'built' ? 'badge-green' : feature.buildStatus === 'in_progress' ? 'badge-amber' : 'badge-gray'}`}>{feature.defaultPlan}</span>
          </label>
        ))}
      </div>
    </section>
  );
}
