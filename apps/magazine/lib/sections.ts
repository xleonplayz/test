import type { Section, SectionSlug } from "@/lib/types";

export const SECTIONS: readonly Section[] = [
  {
    slug: "world",
    name: "World",
    tagline: "Reporting from across the globe.",
    accent: "#2563eb",
    order: 1,
  },
  {
    slug: "technology",
    name: "Technology",
    tagline: "The machines, the makers, the consequences.",
    accent: "#7c3aed",
    order: 2,
  },
  {
    slug: "business",
    name: "Business",
    tagline: "Markets, money and the people moving them.",
    accent: "#059669",
    order: 3,
  },
  {
    slug: "culture",
    name: "Culture",
    tagline: "Film, books, music and the wider conversation.",
    accent: "#db2777",
    order: 4,
  },
  {
    slug: "science",
    name: "Science",
    tagline: "Discoveries, climate and the natural world.",
    accent: "#0891b2",
    order: 5,
  },
  {
    slug: "opinion",
    name: "Opinion",
    tagline: "Arguments worth having.",
    accent: "#d97706",
    order: 6,
  },
] as const;

const BY_SLUG: ReadonlyMap<SectionSlug, Section> = new Map(
  SECTIONS.map((s) => [s.slug, s]),
);

export function getSection(slug: string): Section | undefined {
  return BY_SLUG.get(slug as SectionSlug);
}

export function isSectionSlug(slug: string): slug is SectionSlug {
  return BY_SLUG.has(slug as SectionSlug);
}

export function orderedSections(): readonly Section[] {
  return [...SECTIONS].sort((a, b) => a.order - b.order);
}
