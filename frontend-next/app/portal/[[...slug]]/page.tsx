import { PreviewWorkspace } from '@/components/PreviewWorkspace';
export default function PortalPage({ params }: { params: { slug?: string[] } }) { return <PreviewWorkspace area="Student and parent portal" section={params.slug?.join('/') || 'home'} />; }
