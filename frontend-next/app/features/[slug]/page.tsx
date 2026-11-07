import { notFound } from 'next/navigation';
import { PublicInfoPage } from '@/components/PublicInfoPage';
import { featureRegistry } from '@/config/features';

export default function FeatureDetailPage({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  const feature = featureRegistry.find((entry) => entry.id.toLowerCase() === slug.toLowerCase() || entry.name.toLowerCase().replaceAll(' ', '-') === slug.toLowerCase());
  if (!feature) notFound();
  return <PublicInfoPage eyebrow={`${feature.module} · ${feature.plan}`} title={feature.name} intro="A clearly labelled ClassSight capability with an explicit implementation boundary." preview={feature.status !== 'WIRED'}><section className="section-card"><h2>{feature.status}</h2><p>Route: {feature.route}</p><p>This capability is documented in the feature registry and will not claim live delivery unless its backend contract exists.</p></section></PublicInfoPage>;
}
