export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <article className={`ui-card ${className}`}>{children}</article>;
}
