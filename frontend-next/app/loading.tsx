import { Logo } from '@/components/brand/Logo';

export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        padding: '32px',
      }}
    >
      <Logo variant="mark" tone="auto" size={56} loading decorative />
      <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 600 }}>
        Loading ClassSight…
      </span>
    </div>
  );
}
