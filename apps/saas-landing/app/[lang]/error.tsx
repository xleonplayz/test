"use client";

import { useEffect } from "react";

/**
 * Segment-level error boundary. Client component (required by Next.js) that
 * surfaces a recoverable error with a reset action.
 */
export default function SegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In production this would report to an error tracker.
    console.error(error);
  }, [error]);

  return (
    <section className="section">
      <div className="container center" style={{ paddingTop: 80 }}>
        <p className="eyebrow" style={{ color: "var(--danger)" }}>
          Error
        </p>
        <h1>Something went wrong</h1>
        <p className="muted">{error.message || "An unexpected error occurred."}</p>
        <button className="btn btn-primary" onClick={() => reset()} style={{ marginTop: 16 }}>
          Try again
        </button>
      </div>
    </section>
  );
}
