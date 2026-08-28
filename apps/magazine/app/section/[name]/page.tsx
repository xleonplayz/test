import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArticleList from "@/app/components/ArticleList";
import { getArticlesBySection } from "@/lib/articles";
import { SECTIONS, getSection, isSectionSlug } from "@/lib/sections";
import { absoluteUrl } from "@/lib/site";
import { pluralize } from "@/lib/format";

// One static page per section, refreshed via ISR.
export const revalidate = 600;
export const dynamicParams = false;

interface SectionPageProps {
  params: { name: string };
}

export function generateStaticParams(): { name: string }[] {
  return SECTIONS.map((s) => ({ name: s.slug }));
}

export async function generateMetadata({
  params,
}: SectionPageProps): Promise<Metadata> {
  const section = getSection(params.name);
  if (!section) {
    return { title: "Section not found" };
  }
  const title = `${section.name}`;
  return {
    title,
    description: section.tagline,
    alternates: { canonical: absoluteUrl(`/section/${section.slug}`) },
    openGraph: {
      title: `${section.name} · The Columbus Magazine`,
      description: section.tagline,
      url: absoluteUrl(`/section/${section.slug}`),
    },
  };
}

export default async function SectionPage({ params }: SectionPageProps) {
  if (!isSectionSlug(params.name)) {
    notFound();
  }
  const section = getSection(params.name)!;
  const articles = await getArticlesBySection(section.slug);

  return (
    <>
      <p className="breadcrumbs">
        <a href="/">Home</a> / {section.name}
      </p>
      <div className="section-banner" style={{ background: section.accent }}>
        <h1>{section.name}</h1>
        <p>{section.tagline}</p>
      </div>
      <p className="muted">{pluralize(articles.length, "story", "stories")}</p>
      <ArticleList
        articles={articles}
        showSection={false}
        emptyMessage="No stories in this section yet — check back soon."
      />
    </>
  );
}
