import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Department view | ClassSight',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
