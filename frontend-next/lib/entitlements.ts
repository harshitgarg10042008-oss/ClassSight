import { features, type Feature } from './features.ts';
import type { PlanId } from './plans.ts';

const rank: Record<PlanId, number> = { essential: 0, pro: 1, advanced: 2 };

export function hasFeature(plan: PlanId, feature: Feature): boolean {
  return rank[plan] >= rank[feature.defaultPlan];
}

export function featuresForPlan(plan: PlanId): Feature[] {
  return features.filter((feature) => hasFeature(plan, feature));
}
