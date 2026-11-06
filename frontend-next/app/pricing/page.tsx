import Link from 'next/link';
import { MarketingLayout } from '@/components/MarketingLayout';
import { plans, planLabel } from '@/lib/plans';
import { features } from '@/lib/features';

export const metadata = { title: 'Plans | ClassSight', description: 'Compare ClassSight plans and capabilities.' };

export default function PricingPage() {
  return <MarketingLayout><main className="marketing-main"><section className="pricing-header"><span className="eyebrow">Plans</span><h1>Choose the shape of your rollout.</h1><p>Prices and limits are intentionally unset until an owner configures them.</p></section><div className="pricing-grid">{plans.map((plan) => <article className="pricing-card" key={plan.id}><span className="plan-kicker">{plan.name}</span><h2>{planLabel(plan)}</h2><p>{plan.description}</p><ul>{features.filter((feature) => feature.defaultPlan === plan.id).slice(0, 4).map((feature) => <li key={feature.id}>{feature.name}</li>)}</ul><Link className="button button-outline" href="/app">Use workspace</Link></article>)}</div></main></MarketingLayout>;
}
