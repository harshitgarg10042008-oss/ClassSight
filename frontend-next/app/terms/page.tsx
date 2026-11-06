import Link from 'next/link';

export const metadata = { title: 'Terms of use | ClassSight', description: 'Draft ClassSight terms of use.' };

export default function TermsPage() {
  return (
    <main className="legal-shell">
      <article className="legal-card"><div className="draft-banner">Draft: have a lawyer review before publishing.</div>
        <Link href="/" className="legal-brand">ClassSight</Link>
        <span className="eyebrow">Service terms</span>
        <h1>Terms of use</h1>
        <p>ClassSight is an institutional attendance tool. Use it only for authorized classes, approved accounts, and lawful attendance administration.</p>
        <h2>Responsible use</h2>
        <p>Teachers and administrators must verify the class roster, review low-confidence matches, and correct recognition errors before finalizing attendance. A face match is an aid, not the sole basis for disciplinary action.</p>
        <h2>Uploaded content</h2>
        <p>Only upload classroom images when the institution has the required permission and consent. Do not upload unrelated people, sensitive images, or content that you are not authorized to process.</p>
        <h2>Availability</h2>
        <p>Recognition can be affected by lighting, distance, pose, and image quality. Always provide a manual review path for students who are not confidently recognized.</p>
        <h2>Draft placeholders</h2>
        <p>Company legal name: [Company legal name]. Registered address: [Registered address]. Contact: [Contact email]. Jurisdiction: [Jurisdiction].</p>
        <p className="legal-links"><Link href="/privacy">Privacy notice</Link><Link href="/app">Back to workspace</Link></p>
      </article>
    </main>
  );
}
