import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Capture and review | ClassSight',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
