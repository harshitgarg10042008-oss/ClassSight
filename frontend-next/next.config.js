/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async redirects() {
    return [
      { source: '/home', destination: '/', permanent: true },
      { source: '/enrollment', destination: '/app/enrollment', permanent: true },
      { source: '/analytics', destination: '/app/analytics', permanent: true },
      { source: '/teacher', destination: '/app/teacher', permanent: true },
      { source: '/student', destination: '/app/student', permanent: true },
      { source: '/hod', destination: '/app/hod', permanent: true },
    ];
  },
};
module.exports = nextConfig;
