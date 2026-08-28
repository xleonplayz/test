import Link from "next/link";
import { orderedSections } from "@/lib/sections";

export default function NotFound() {
  const sections = orderedSections();
  return (
    <div style={{ padding: "64px 0", textAlign: "center" }}>
      <p className="kicker">404</p>
      <h1 className="page-title">This page has gone to print</h1>
      <p className="muted" style={{ maxWidth: 480, margin: "0 auto" }}>
        The page you&apos;re looking for doesn&apos;t exist. Maybe it was moved,
        or maybe it never made it past the copy desk.
      </p>
      <div
        className="tag-row"
        style={{ justifyContent: "center", marginTop: 24 }}
      >
        <Link className="btn" href="/">
          Front page
        </Link>
        {sections.slice(0, 3).map((s) => (
          <Link key={s.slug} className="tag-pill" href={`/section/${s.slug}`}>
            {s.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
