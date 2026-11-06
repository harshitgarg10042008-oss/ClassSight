export function SampleDataChip() {
  return process.env.NEXT_PUBLIC_DEMO_DATA === 'true' ? <span className="sample-chip">Sample data</span> : null;
}

export function StaticPage({ title, eyebrow, children }: { title: string; eyebrow?: string; children: React.ReactNode }) {
  return (
    <main className="static-shell">
      <div className="static-header"><div><span className="eyebrow">{eyebrow ?? 'ClassSight'}</span><h1>{title}</h1></div><SampleDataChip /></div>
      {children}
    </main>
  );
}
