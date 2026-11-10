import { Logo } from '@/components/brand/Logo';

export default function MaintenancePage() {
  return (
    <main id="main-content" className="system-page">
      <div style={{ marginBottom: 16 }}>
        <Logo variant="mark" tone="auto" size={48} />
      </div>
      <span className="eyebrow">Maintenance</span>
      <h1>We are making ClassSight better.</h1>
      <p>Please try again shortly.</p>
    </main>
  );
}

export const metadata = { title: 'Scheduled maintenance | ClassSight' };
