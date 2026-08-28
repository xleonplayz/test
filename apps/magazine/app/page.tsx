import Link from "next/link";
import ArticleCard from "@/app/components/ArticleCard";
import ArticleList from "@/app/components/ArticleList";
import SearchBox from "@/app/components/SearchBox";
import SectionPill from "@/app/components/SectionPill";
import { getFeatured, getPublishedArticles } from "@/lib/articles";
import { orderedSections } from "@/lib/sections";
import type { ResolvedArticle, SectionSlug } from "@/lib/types";

// Homepage uses Incremental Static Regeneration: rebuilt at most every 5 minutes.
export const revalidate = 300;

function groupBySection(
  articles: readonly ResolvedArticle[],
): Map<SectionSlug, ResolvedArticle[]> {
  const map = new Map<SectionSlug, ResolvedArticle[]>();
  for (const article of articles) {
    const bucket = map.get(article.section) ?? [];
    bucket.push(article);
    map.set(article.section, bucket);
  }
  return map;
}

export default async function HomePage() {
  const [all, featured] = await Promise.all([
    getPublishedArticles(),
    getFeatured(),
  ]);

  const lead = featured[0] ?? all[0];
  const secondary = (featured.length > 1 ? featured.slice(1) : all.slice(1, 3))
    .filter((a) => a.slug !== lead?.slug)
    .slice(0, 2);

  const recent = all.filter((a) => a.slug !== lead?.slug).slice(0, 6);
  const grouped = groupBySection(all);
  const sections = orderedSections();

  return (
    <>
      <SearchBox />

      {lead && (
        <section className="lead-grid">
          <ArticleCard article={lead} lead />
          <div className="card-grid" style={{ gridTemplateColumns: "1fr" }}>
            {secondary.map((article) => (
              <ArticleCard key={article.slug} article={article} />
            ))}
          </div>
        </section>
      )}

      <hr className="divider" />

      <h2 className="page-title" style={{ fontSize: "1.6rem" }}>
        Latest stories
      </h2>
      <ArticleList articles={recent} />

      <hr className="divider" />

      {sections.map((section) => {
        const items = (grouped.get(section.slug) ?? []).slice(0, 3);
        if (items.length === 0) return null;
        return (
          <section key={section.slug} style={{ marginBottom: 40 }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <h2 style={{ fontSize: "1.5rem", margin: 0 }}>
                <SectionPill section={section} />
              </h2>
              <Link href={`/section/${section.slug}`}>More in {section.name} →</Link>
            </div>
            <ArticleList articles={items} showSection={false} />
          </section>
        );
      })}
    </>
  );
}
