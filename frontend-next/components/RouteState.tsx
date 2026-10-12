type RouteStateProps = {
  loading: boolean;
  error?: string;
  empty: boolean;
  emptyMessage: string;
  children: React.ReactNode;
};

export function RouteState({ loading, error, empty, emptyMessage, children }: RouteStateProps) {
  if (loading) {
    return <p role="status">Loading...</p>;
  }
  if (error) {
    return <div className="alert alert-info" role="alert">{error}</div>;
  }
  if (empty) {
    return <p role="status">{emptyMessage}</p>;
  }
  return <>{children}</>;
}
