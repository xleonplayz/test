import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import Byline from "@/app/components/Byline";
import Markdown from "@/app/components/Markdown";
import SectionPill from "@/app/components/SectionPill";
import TagList from "@/app/components/TagList";
import RelatedPosts from "@/app/components/RelatedPosts";
import {
  getAllSlugs,
  getArticleBySlug,
  getRawMarkdown,
} from "@/lib/articles";
import { absoluteUrl } from "@/lib/site";
import { formatDate } from "@/lib/format";
import { excerpt } from "@/lib/markdown";

// Articles are statically generated and revalidated hourly (ISR).
export const revalidate = 3600;
export const dynamicParams = true;

interface ArticlePageProps {
  params: { slug: string };
}

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const slugs = await getAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const result = await getArticleBySlug(params.slug);
  if (!result.ok) {
    return { title: "Article not found" };
  }
  const article = result.value;
  const description = excerpt(article.dek || article.plainText, 160);
  const canonical = absoluteUrl(`/article/${article.slug}`);

  return {
    title: article.title,
    description,
    authors: [{ name: article.author.name }],
    alternates: { canonical },
    keywords: [...article.tags, article.sectionInfo.name],
    openGraph: {
      type: "article",
      title: article.title,
      description,
      url: canonical,
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt ?? article.publishedAt,
      authors: [article.author.name],
      section: article.sectionInfo.name,
      tags: [...article.tags],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description,
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const result = await getArticleBySlug(params.slug);
  if (!result.ok) {
    notFound();
  }
  const article = result.value;
  // NB: bind the awaited value to a local before `?? ""`. Reading `(await fn())`
  // directly as a `??`/member operand currently mis-reads its .length (lly
  // codegen bug, tracked in backbench repros/forof-await-string-length). The
  // two-statement form is the idiomatic, lly-supported shape.
  const rawMarkdown = await getRawMarkdown(article.slug);
  const markdown = rawMarkdown ?? "";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.dek,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt ?? article.publishedAt,
    author: { "@type": "Person", name: article.author.name },
    articleSection: article.sectionInfo.name,
    keywords: article.tags.join(", "),
  };

  return (
    <article style={{ padding: "12px 0 0" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <p className="breadcrumbs">
        <a href="/">Home</a> /{" "}
        <a href={`/section/${article.section}`}>{article.sectionInfo.name}</a>
      </p>

      <div style={{ marginBottom: 8 }}>
        <SectionPill section={article.sectionInfo} />
      </div>

      <h1 className="page-title" style={{ maxWidth: 760 }}>
        {article.heroEmoji} {article.title}
      </h1>
      <p className="dek" style={{ maxWidth: 700 }}>
        {article.dek}
      </p>

      <Byline article={article} />

      {article.updatedAt && (
        <p className="muted" style={{ fontSize: "0.82rem" }}>
          Updated {formatDate(article.updatedAt)}
        </p>
      )}

      <hr className="divider" style={{ margin: "24px 0" }} />

      {/* Async server component renders markdown to HTML. */}
      <Markdown source={markdown} />

      <hr className="divider" />

      <TagList tags={article.tags} />

      {/* Related posts streamed in via Suspense. */}
      <Suspense
        fallback={
          <section className="related">
            <h2>Related reading</h2>
            <div className="card-grid">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton skeleton-card" />
              ))}
            </div>
          </section>
        }
      >
        <RelatedPosts slug={article.slug} />
      </Suspense>
    </article>
  );
}
