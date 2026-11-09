import Link from 'next/link';

export const metadata = { title: 'Privacy notice | ClassSight', description: 'Draft ClassSight privacy notice.' };

export default function PrivacyPage() {
  return (
    <main className="legal-shell">
      <article className="legal-card"><div className="draft-banner">Draft: have a lawyer review before publishing.</div>
        <Link href="/" className="legal-brand">ClassSight</Link>
        <span className="eyebrow">Privacy notice</span>
        <h1>Privacy and biometric data</h1>
        <p>ClassSight uses classroom photos and face embeddings only to support attendance and roster recognition for the institution using the system.</p>
        <h2>Consent first</h2>
        <p>A teacher must confirm that everyone in a class photo has agreed before biometric enrollment. Do not upload a photo without the required institutional consent.</p>
        <h2>What is stored</h2>
        <p>The system stores student identifiers, attendance results, and application records according to the institution&apos;s retention policy. Face embeddings are not yet encrypted at rest; they are stored as numeric vectors used solely for matching and are not a replacement for a student&apos;s official academic record.</p>
        <h2>Consent first</h2>
        <p>Designed to support consent workflows; legal text needs lawyer review. Guardian consent is required for minor students before biometric enrollment can take place.</p>
        <h2>Access and deletion</h2>
        <p>Access is restricted by account role. Ask your institution&apos;s administrator to correct, export, or delete biometric enrollment and attendance data.</p>
        <h2>Draft placeholders</h2>
        <p>Company legal name: [Company legal name]. Registered address: [Registered address]. Contact: [Contact email]. Jurisdiction: [Jurisdiction]. Guardian consent for minors and data-subject requests must be confirmed by counsel before publication.</p>
        <p className="legal-links"><Link href="/terms">Terms of use</Link><Link href="/app">Back to workspace</Link></p>
      </article>
    </main>
  );
}
