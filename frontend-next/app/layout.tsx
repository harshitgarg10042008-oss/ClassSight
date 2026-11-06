import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ClassSight | Reviewable classroom attendance',
  description: 'Capture, review, and finalize classroom attendance with ClassSight.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
