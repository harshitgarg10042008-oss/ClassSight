import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { WorkspacePage, resolveSection } from '@/components/workspace/WorkspacePage';

export function generateMetadata({ params }: { params: { section: string } }): Metadata {
  const spec = resolveSection('teacher', params.section);
  return {
    title: spec ? `${spec.title} — faculty workspace | ClassSight` : 'Faculty workspace | ClassSight',
    description: spec?.summary ?? 'Faculty workspace preview.',
  };
}

export default function TeacherSectionPage({ params }: { params: { section: string } }) {
  if (!resolveSection('teacher', params.section)) notFound();
  return <WorkspacePage area="teacher" sectionId={params.section} />;
}
