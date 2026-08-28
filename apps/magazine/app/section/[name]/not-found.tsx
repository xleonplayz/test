import Link from "next/link";
import { orderedSections } from "@/lib/sections";

export default function SectionNotFound() {
  const sections = orderedSections();
  return (
    <div style={{ padding: "48px 0" }}>
      <p className="kicker">404</p>
      <h1 className="page-title">No such section</h1>
      <p className="muted">
        That section doesn&apos;t exist. Try one of these instead:
      </p>
      <div className="tag-row" style={{ marginTop: 16 }}>
        {sections.map((s) => (
          <Link key={s.slug} className="tag-pill" href={`/section/${s.slug}`}>
            {s.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
