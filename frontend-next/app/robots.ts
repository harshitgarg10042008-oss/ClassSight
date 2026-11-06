export default function robots() {
  return { rules: [{ userAgent: '*', disallow: ['/app', '/admin', '/owner'] }], sitemap: 'http://localhost:3000/sitemap.xml' };
}
