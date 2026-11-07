export function SampleBanner({ children = 'Sample data — nothing here is connected to a live institution.' }: { children?: React.ReactNode }) {
  return <div className="sample-banner" role="status"><strong>Preview</strong> {children}</div>;
}
