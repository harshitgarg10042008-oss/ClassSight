import type { Metadata } from 'next';
import './globals.css';
import { CookieBanner } from '@/components/CookieBanner';
import { site } from '@/config/site';

export const metadata: Metadata = {
  title: `${site.name} | ${site.tagline}`,
  description: 'Capture, review, and finalize classroom attendance with a faculty review step.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('classsight-theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}` }} /></head><body><a className="skip-link" href="#main-content">Skip to content</a>{children}<CookieBanner /></body></html>;
}
