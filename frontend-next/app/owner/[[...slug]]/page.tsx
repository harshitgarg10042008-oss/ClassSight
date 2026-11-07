import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { WorkspacePage, resolveSection } from '@/components/workspace/WorkspacePage';

function sectionId(params: { slug?: string[] }) {
  return params.slug?.join('/') || 'overview';
}

export function generateMetadata({ params }: { params: { slug?: string[] } }): Metadata {
  const spec = resolveSection('owner', sectionId(params));
  if (!params.slug?.length) {
    return { title: 'Owner console | ClassSight', description: 'Platform owner preview.' };
  }
  return {
    title: spec ? `${spec.title} — owner console | ClassSight` : 'Owner console | ClassSight',
    description: spec?.summary ?? 'Platform owner preview.',
  };
}

export default function OwnerPage({ params }: { params: { slug?: string[] } }) {
  if (process.env.NEXT_PUBLIC_DEMO_DATA !== 'true') notFound();
  const id = sectionId(params);
  if (!resolveSection('owner', id)) notFound();
  return <WorkspacePage area="owner" sectionId={id} />;
}
