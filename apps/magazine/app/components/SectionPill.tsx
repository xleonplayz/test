import Link from "next/link";
import type { Section } from "@/lib/types";

interface SectionPillProps {
  section: Section;
  asLink?: boolean;
}

export default function SectionPill({ section, asLink = true }: SectionPillProps) {
  const style = { background: section.accent, borderColor: "transparent" };
  if (!asLink) {
    return (
      <span className="section-pill" style={style}>
        {section.name}
      </span>
    );
  }
  return (
    <Link
      className="section-pill"
      style={style}
      href={`/section/${section.slug}`}
    >
      {section.name}
    </Link>
  );
}
