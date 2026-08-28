import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import type { LangParams } from "@/lib/types";
import { posts } from "@/lib/content";
import { SectionHeading } from "@/app/components/SectionHeading";

export async function generateMetadata({ params }: LangParams): Promise<Metadata> {
  if (!isLocale(params.lang)) return {};
  return { title: getDictionary(params.lang).nav.blog };
}

function formatDate(iso: string, lang: Locale): string {
  const locale = lang === "de" ? "de-DE" : lang === "fr" ? "fr-FR" : "en-US";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(iso));
}

export default function BlogIndexPage({ params }: LangParams) {
  if (!isLocale(params.lang)) notFound();
  const lang = params.lang;
  const t = getDictionary(lang);

  const sorted = [...posts].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <section className="section">
      <div className="container">
        <SectionHeading eyebrow={t.nav.blog} title={t.nav.blog} />
        <div className="post-list">
          {sorted.map((post) => (
            <article className="post-card" key={post.slug}>
              <div className="post-meta" style={{ marginBottom: 8 }}>
                <time dateTime={post.date}>{formatDate(post.date, lang)}</time>
                <span>·</span>
                <span>{post.author}</span>
                <span>·</span>
                <span>
                  {post.readingMinutes} min {t.common.readMore.toLowerCase()}
                </span>
              </div>
              <h3>
                <Link href={`/${lang}/blog/${post.slug}`}>{post.title[lang]}</Link>
              </h3>
              <p>{post.excerpt[lang]}</p>
              <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {post.tags.map((tag) => (
                  <span className="tag" key={tag}>
                    #{tag}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
