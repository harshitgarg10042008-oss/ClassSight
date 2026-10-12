import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <main className="legal-shell">
      <article className="legal-card">
        <Link href="/" className="legal-brand">ClassSight</Link>
        <span className="eyebrow">Privacy notice</span>
        <h1>Privacy and biometric data</h1>
        <p>ClassSight uses classroom photos and face embeddings only to support attendance and roster recognition for the institution using the system.</p>
        <h2>Consent first</h2>
        <p>A teacher must confirm that everyone in a class photo has agreed before biometric enrollment. Do not upload a photo without the required institutional consent.</p>
        <h2>What is stored</h2>
        <p>The system stores student identifiers, attendance results, and encrypted application data according to the institution&apos;s retention policy. Face embeddings are used for matching and are not a replacement for a student&apos;s name or identity record.</p>
        <h2>Access and deletion</h2>
        <p>Access is restricted by account role. Ask your institution&apos;s administrator to correct, export, or delete biometric enrollment and attendance data.</p>
        <p className="legal-links"><Link href="/terms">Terms of use</Link><Link href="/">Back to sign in</Link></p>
      </article>
    </main>
  );
}
