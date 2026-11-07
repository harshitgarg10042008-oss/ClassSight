import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { WorkspacePage, resolveSection } from '@/components/workspace/WorkspacePage';

function sectionId(params: { slug?: string[] }) {
  return params.slug?.join('/') || 'home';
}

export function generateMetadata({ params }: { params: { slug?: string[] } }): Metadata {
  const spec = resolveSection('portal', sectionId(params));
  if (!params.slug?.length) {
    return { title: 'Student and parent portal | ClassSight', description: 'Student and parent portal preview.' };
  }
  return {
    title: spec ? `${spec.title} — student and parent portal | ClassSight` : 'Portal | ClassSight',
    description: spec?.summary ?? 'Student and parent portal preview.',
  };
}

export default function PortalPage({ params }: { params: { slug?: string[] } }) {
  const id = sectionId(params);
  if (!resolveSection('portal', id)) notFound();
  return <WorkspacePage area="portal" sectionId={id} />;
}
