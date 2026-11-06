import type { Metadata } from 'next';
import './globals.css';
import { CookieBanner } from '@/components/CookieBanner';

export const metadata: Metadata = {
  title: 'ClassSight | Reviewable classroom attendance',
  description: 'Capture, review, and finalize classroom attendance with ClassSight.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><a className="skip-link" href="#main-content">Skip to content</a>{children}<CookieBanner /></body></html>;
}
