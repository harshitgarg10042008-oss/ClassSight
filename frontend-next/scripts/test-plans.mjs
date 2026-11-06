import assert from 'node:assert/strict';
import { features } from '../lib/features.ts';
import { hasFeature } from '../lib/entitlements.ts';
import { plans, planLabel } from '../lib/plans.ts';

assert.equal(features.length, 20);
assert.deepEqual(
  Object.fromEntries(plans.map((plan) => [plan.id, features.filter((feature) => feature.defaultPlan === plan.id).length])),
  { essential: 6, pro: 7, advanced: 7 },
);
assert.ok(features.every((feature) => feature.defaultPlan));
assert.ok(features.filter((feature) => feature.buildStatus === 'built').every((feature) => Boolean(feature.evidence)));
assert.equal(planLabel(plans[0]), 'Contact us');
assert.ok(features.every((feature) => hasFeature('advanced', feature)));
assert.ok(features.filter((feature) => feature.defaultPlan === 'pro').every((feature) => !hasFeature('essential', feature)));
console.log('Plan registry tests passed: 20 features, 6/7/7 split, cumulative entitlements, evidence, and null pricing fallback.');
