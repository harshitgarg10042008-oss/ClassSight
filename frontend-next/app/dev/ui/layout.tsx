import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Design review | ClassSight',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
