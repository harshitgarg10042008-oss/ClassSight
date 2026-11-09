import { PublicInfoPage } from '@/components/PublicInfoPage';

export const metadata = { title: 'Security | ClassSight', description: 'Transparent security, biometric storage, and accountability boundaries.' };

export default function SecurityPage() {
  return (
    <PublicInfoPage
      eyebrow="Trust & Security"
      title="Transparent about what is ready."
      intro="Security is a product practice, not a marketing badge. We document our technical boundaries honestly."
    >
      <section className="section-card" style={{ marginTop: '24px' }}>
        <h2>Biometric Storage & Safeguards</h2>
        <ul style={{ lineHeight: '1.8' }}>
          <li>
            <strong>Faculty Review Requirement:</strong> Single-capture attendance cannot be committed without the faculty review call; multi-shot finalise can finalise a clean accumulator by explicit faculty action.
          </li>
          <li>
            <strong>Encryption Status:</strong> Face embeddings are not yet encrypted at rest.
          </li>
          <li>
            <strong>Consent Workflows:</strong> Designed to support consent workflows; legal text needs lawyer review. Guardian consent is required for minor students.
          </li>
          <li>
            <strong>Benchmark Accuracy:</strong> Simulated on LFW, NOT classroom accuracy. Real classroom recognition depends on lighting, distance, and pose.
          </li>
          <li>
            <strong>Data Minimization:</strong> ClassSight stores normalized numerical vectors, not raw high-resolution facial images.
          </li>
        </ul>
      </section>
    </PublicInfoPage>
  );
}
