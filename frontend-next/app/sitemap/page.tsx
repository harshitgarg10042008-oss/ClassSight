import Link from 'next/link';
import { routes } from '@/config/routes';
export default function SitemapPage() { return <main className="marketing-main"><h1>ClassSight sitemap</h1><p>Public and workspace routes in this frontend.</p><ul>{routes.map((route) => <li key={route.path}><Link href={route.path}>{route.path}</Link> — {route.purpose}</li>)}</ul></main>; }

export const metadata = { title: 'Sitemap | ClassSight' };
