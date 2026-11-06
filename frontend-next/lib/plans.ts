export type PlanId = 'essential' | 'pro' | 'advanced';

export type Plan = {
  id: PlanId;
  name: string;
  description: string;
  monthly: number | null;
  yearly: number | null;
  currency: string;
};

export const plans: Plan[] = [
  { id: 'essential', name: 'Essential', description: 'The core attendance workflow for a focused team.', monthly: null, yearly: null, currency: 'INR' },
  { id: 'pro', name: 'Pro', description: 'More automation and insight for growing institutions.', monthly: null, yearly: null, currency: 'INR' },
  { id: 'advanced', name: 'Advanced', description: 'Flexible integrations and controls at scale.', monthly: null, yearly: null, currency: 'INR' },
];

export function planLabel(plan: Plan): string {
  return plan.monthly === null ? 'Contact us' : `${plan.currency} ${plan.monthly}/month`;
}
