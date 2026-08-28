"use client";

import { useEffect } from "react";
import Link from "next/link";

interface ArticleErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ArticleError({ error, reset }: ArticleErrorProps) {
  useEffect(() => {
    // In a real app this would report to an error service.
    console.error("Article render failed:", error);
  }, [error]);

  return (
    <div style={{ padding: "48px 0" }}>
      <p className="kicker">Something went wrong</p>
      <h1 className="page-title">We couldn&apos;t load this story</h1>
      <p className="muted">
        An unexpected error occurred while rendering this article.
        {error.digest ? ` (ref: ${error.digest})` : null}
      </p>
      <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
        <button className="btn" type="button" onClick={() => reset()}>
          Try again
        </button>
        <Link className="btn ghost" href="/">
          Go home
        </Link>
      </div>
    </div>
  );
}
