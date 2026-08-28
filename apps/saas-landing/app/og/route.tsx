import { ImageResponse } from "next/og";

export const runtime = "edge";

/**
 * Dynamic Open Graph image.
 *   GET /og?title=Hello&subtitle=World
 * Renders a 1200×630 social card with the Columbus gradient brand mark.
 */
export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = (searchParams.get("title") ?? "Columbus").slice(0, 90);
  const subtitle =
    searchParams.get("subtitle") ?? "Warehouse-native product analytics";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: "linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "rgba(255,255,255,0.95)",
            }}
          />
          <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: -1 }}>Columbus</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>
            {title}
          </div>
          <div style={{ fontSize: 30, opacity: 0.92 }}>{subtitle}</div>
        </div>

        <div style={{ fontSize: 24, opacity: 0.85 }}>columbus.example</div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
