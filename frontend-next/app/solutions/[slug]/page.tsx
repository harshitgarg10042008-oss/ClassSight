import type { Metadata } from 'next';
import { PublicInfoPage } from '@/components/PublicInfoPage';

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const label = params.slug.charAt(0).toUpperCase() + params.slug.slice(1);
  return {
    title: `${label} solutions | ClassSight`,
    description: `Reviewable attendance for ${params.slug}, built on the same faculty-review foundation.`,
  };
}

export default function SolutionsPage({ params }: { params: { slug: string } }) { return <PublicInfoPage eyebrow="Solutions" title={`A clearer workflow for ${params.slug}.`} intro="Start from the same reviewable attendance foundation and adapt the surrounding workflow to your institution."><section className="section-card"><h2>Preview solution</h2><p>Audience-specific guidance is UI-PREVIEW until connected to an institution configuration.</p></section></PublicInfoPage>; }
