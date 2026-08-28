"use client";

import { useEffect } from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("Fatal application error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "grid",
          placeItems: "center",
          minHeight: "100vh",
          margin: 0,
          background: "#0e1117",
          color: "#e9edf2",
        }}
      >
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: "2rem", marginBottom: 8 }}>
            The presses have stopped
          </h1>
          <p style={{ opacity: 0.8 }}>
            A fatal error took down the whole edition.
            {error.digest ? ` (ref: ${error.digest})` : null}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: 20,
              padding: "10px 18px",
              border: "1px solid #6f9bff",
              background: "#6f9bff",
              color: "#0e1117",
              borderRadius: 10,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
