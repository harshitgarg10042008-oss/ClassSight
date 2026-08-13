import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ClassSight Faculty Flow',
  description: 'Additive faculty attendance capture and review workspace',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
