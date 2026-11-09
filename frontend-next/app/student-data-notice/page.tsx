import { StaticPage } from '@/components/StaticPage';

export const metadata = { title: 'Student Data Notice | ClassSight', description: 'Notice regarding student biometric data processing and minor guardian consent.' };

export default function StudentDataNoticePage() {
  return (
    <StaticPage title="Student Data Notice" eyebrow="Draft, needs lawyer review">
      <div style={{ lineHeight: '1.8' }}>
        <p>
          <strong>Guardian Consent:</strong> Guardian consent is strictly required for minor students under 18 years of age prior to any facial template enrollment.
        </p>
        <p>
          Designed to support consent workflows; legal text needs lawyer review. Face embeddings are not yet encrypted at rest.
        </p>
        <p>
          Students or their authorized legal guardians may request an itemized Privacy Receipt (D20) or submit a full data erasure request at any time through their institutional administration.
        </p>
      </div>
    </StaticPage>
  );
}
