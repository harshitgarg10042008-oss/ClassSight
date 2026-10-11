import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ClassSight Attendance',
    short_name: 'ClassSight',
    description: 'Timetable-aware, privacy-first classroom attendance',
    start_url: '/',
    display: 'standalone',
    background_color: '#f5f7f2',
    theme_color: '#234f3d',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
