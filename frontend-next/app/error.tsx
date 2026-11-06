'use client';

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main id="main-content" className="system-page"><span className="eyebrow">Something went wrong</span><h1>We could not load this page.</h1><button className="button button-primary" onClick={reset}>Try again</button></main>;
}
