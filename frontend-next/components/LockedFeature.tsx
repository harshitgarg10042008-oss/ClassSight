import Link from 'next/link';

export function LockedFeature({ name, plan = 'Pro', description }: { name: string; plan?: string; description: string }) {
  return <article className="locked-card"><span className="badge">Available on {plan}</span><h3>{name}</h3><p>{description}</p><Link className="button button-outline" href="/pricing">Compare plans</Link></article>;
}
