import Link from 'next/link';
import { MarketingLayout } from './MarketingLayout';
import { SampleBanner } from './ui/SampleBanner';

export function PublicInfoPage({ eyebrow, title, intro, children, preview = false }: { eyebrow: string; title: string; intro: string; children: React.ReactNode; preview?: boolean }) {
  return <MarketingLayout><main className="marketing-main"><section className="pricing-header"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{intro}</p></section>{preview && <SampleBanner />}{children}<p style={{ marginTop: 32 }}><Link href="/contact">Talk to the ClassSight team</Link></p></main></MarketingLayout>;
}
