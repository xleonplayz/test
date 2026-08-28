import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary, isLocale, locales, type Locale } from "@/lib/i18n";
import { getPost, posts } from "@/lib/content";

interface PostParams {
  params: { lang: string; slug: string };
}

export function generateStaticParams(): { lang: Locale; slug: string }[] {
  return locales.flatMap((lang) => posts.map((post) => ({ lang, slug: post.slug })));
}

export async function generateMetadata({ params }: PostParams): Promise<Metadata> {
  if (!isLocale(params.lang)) return {};
  const post = getPost(params.slug);
  if (!post) return { title: "Not found" };
  return {
    title: post.title[params.lang],
    description: post.excerpt[params.lang],
    openGraph: {
      title: post.title[params.lang],
      description: post.excerpt[params.lang],
      type: "article",
      publishedTime: post.date,
      images: [`/og?title=${encodeURIComponent(post.title[params.lang])}`],
    },
  };
}

function formatDate(iso: string, lang: Locale): string {
  const locale = lang === "de" ? "de-DE" : lang === "fr" ? "fr-FR" : "en-US";
  return new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date(iso));
}

export default function BlogPostPage({ params }: PostParams) {
  if (!isLocale(params.lang)) notFound();
  const lang = params.lang;
  const post = getPost(params.slug);
  if (!post) notFound();

  const t = getDictionary(lang);

  return (
    <article className="section">
      <div className="container prose">
        <Link href={`/${lang}/blog`} className="muted" style={{ display: "inline-block", marginBottom: 16 }}>
          ← {t.nav.blog}
        </Link>
        <h1>{post.title[lang]}</h1>
        <div className="post-meta" style={{ marginBottom: 24 }}>
          <time dateTime={post.date}>{formatDate(post.date, lang)}</time>
          <span>·</span>
          <span>{post.author}</span>
          <span>·</span>
          <span>{post.readingMinutes} min</span>
        </div>
        <p>{post.body[lang]}</p>
        <div style={{ marginTop: 24, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {post.tags.map((tag) => (
            <span className="tag" key={tag}>
              #{tag}
            </span>
          ))}
        </div>
        <hr className="divider" />
        <Link className="btn btn-ghost" href={`/${lang}/blog`}>
          ← {t.nav.blog}
        </Link>
      </div>
    </article>
  );
}
