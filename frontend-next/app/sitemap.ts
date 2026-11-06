import { routes } from '@/config/routes';

export default function sitemap() {
  return routes.filter((route) => route.path !== '/admin' && route.path !== '/owner').map((route) => ({
    url: `http://localhost:3000${route.path}`,
    lastModified: new Date(),
  }));
}
