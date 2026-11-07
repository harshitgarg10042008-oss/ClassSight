const routes = [
  '/', '/features', '/features/FT01', '/how-it-works', '/solutions', '/solutions/colleges',
  '/pricing', '/security', '/trust', '/integrations', '/about', '/contact', '/book-demo',
  '/faq', '/docs', '/changelog', '/resources', '/accessibility', '/status', '/sitemap',
  '/privacy', '/terms', '/cookies', '/dpa', '/refund', '/acceptable-use', '/student-data-notice',
  '/login', '/signup', '/forgot-password', '/reset-password', '/verify-email', '/accept-invite',
  '/two-factor', '/logout', '/onboarding', '/app', '/portal', '/notifications', '/admin', '/owner',
];

const base = process.env.BASE_URL || 'http://127.0.0.1:3010';
let failures = 0;
for (const route of routes) {
  const response = await fetch(`${base}${route}`);
  const html = await response.text();
  const h1 = (html.match(/<h1(?:\s[^>]*)?>/gi) || []).length;
  const title = (html.match(/<title(?:\s[^>]*)?>/gi) || []).length;
  const main = (html.match(/<main(?:\s[^>]*)?>/gi) || []).length;
  if (response.status !== 200 || h1 !== 1 || title !== 1 || main < 1) {
    failures += 1;
    console.error(`${route}: status=${response.status} h1=${h1} title=${title} main=${main}`);
  }
}
console.log(`Route sweep: ${routes.length - failures}/${routes.length} passed`);
if (failures) process.exit(1);
