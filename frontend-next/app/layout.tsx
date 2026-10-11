import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ClassSight - Intelligent Biometric Classroom Attendance',
  description: 'Enterprise-grade automated classroom attendance and academic management platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
