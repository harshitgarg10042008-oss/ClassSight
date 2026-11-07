import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { WorkspacePage, resolveSection } from '@/components/workspace/WorkspacePage';

function sectionId(params: { slug?: string[] }) {
  return params.slug?.join('/') || 'overview';
}

export function generateMetadata({ params }: { params: { slug?: string[] } }): Metadata {
  const spec = resolveSection('admin', sectionId(params));
  if (!params.slug?.length) {
    return { title: 'Institution admin | ClassSight', description: 'Institution administration preview.' };
  }
  return {
    title: spec ? `${spec.title} — institution admin | ClassSight` : 'Institution admin | ClassSight',
    description: spec?.summary ?? 'Institution administration preview.',
  };
}

export default function AdminPage({ params }: { params: { slug?: string[] } }) {
  if (process.env.NEXT_PUBLIC_DEMO_DATA !== 'true') notFound();
  const id = sectionId(params);
  if (!resolveSection('admin', id)) notFound();
  return <WorkspacePage area="admin" sectionId={id} />;
}
