import type { Metadata } from 'next';
import { AppProvider } from '@/components/AppContext';

export const metadata: Metadata = {
  title: 'Faculty Workspace | ClassSight',
  description: 'AI-assisted classroom attendance capture, faculty verification and analytics.',
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppProvider>{children}</AppProvider>;
}
