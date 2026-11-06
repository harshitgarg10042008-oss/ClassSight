import Link from 'next/link';
import { MarketingLayout } from '@/components/MarketingLayout';

export const metadata = { title: 'ClassSight | Reviewable classroom attendance', description: 'Capture, review, and finalize classroom attendance.' };

export default function HomePage() {
  return <MarketingLayout>
    <main className="marketing-main">
      <section className="hero">
        <div><span className="eyebrow">Classroom attendance, made reviewable</span><h1>Attendance from one photo of the class.</h1><p className="hero-copy">ClassSight helps faculty capture, review, and finalize attendance without losing the human decision in the loop.</p><div className="hero-actions"><Link className="button button-primary" href="/app">Try the workspace</Link><Link className="button button-outline" href="#how-it-works">See how it works</Link></div></div>
        <div className="hero-panel"><div className="hero-panel-top"><span><span className="status-dot" /> Capture ready</span><span>Reviewable</span></div><div className="class-photo-placeholder"><span>Classroom capture</span><strong>24 faces detected</strong></div><div className="hero-panel-foot"><span>22 auto accepted</span><span>2 to review</span></div></div>
      </section>
      <section id="how-it-works" className="marketing-section"><div className="section-intro"><span className="eyebrow">A clear workflow</span><h2>Four steps, one accountable record.</h2></div><div className="step-grid">{['Enrol', 'Capture', 'Review', 'Finalize'].map((step, index) => <article className="step-card" key={step}><span className="step-number">0{index + 1}</span><h3>{step}</h3><p>{['Create a roster with consent.', 'Use a photo or camera capture.', 'Resolve AUTO, REVIEW, and UNKNOWN results.', 'Export a session summary when ready.'][index]}</p></article>)}</div></section>
      <section className="callout"><div><span className="eyebrow">Start with the wired experience</span><h2>Keep the teacher in control.</h2><p>Recognition is an assistant, not a final authority. Every uncertain result stays visible for review.</p></div><Link className="button button-primary" href="/app">Open workspace</Link></section>
    </main>
  </MarketingLayout>;
}
