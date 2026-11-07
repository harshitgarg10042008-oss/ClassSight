export const site = {
  name: 'ClassSight',
  tagline: 'Attendance that keeps faculty in control.',
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'hello@classsight.example',
  navigation: [
    { href: '/features', label: 'Features' },
    { href: '/how-it-works', label: 'How it works' },
    { href: '/pricing', label: 'Plans' },
    { href: '/security', label: 'Trust' },
  ],
  footer: [
    { href: '/privacy', label: 'Privacy' },
    { href: '/terms', label: 'Terms' },
    { href: '/accessibility', label: 'Accessibility' },
    { href: '/contact', label: 'Contact' },
  ],
} as const;
