import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  getPost,
  getPostSlugs,
  formatDate,
} from "@/lib/posts";

export function generateStaticParams() {
  return getPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  try {
    const post = await getPost(params.slug);
    return {
      title: post.title,
      description: post.excerpt,
      openGraph: {
        title: post.title,
        description: post.excerpt,
        type: "article",
        publishedTime: post.date,
        authors: [post.author],
        tags: post.tags,
      },
    };
  } catch {
    return { title: "Beitrag nicht gefunden" };
  }
}

export default async function PostPage({
  params,
}: {
  params: { slug: string };
}) {
  let post;
  try {
    post = await getPost(params.slug);
  } catch {
    notFound();
  }

  return (
    <article className="container">
      <header className="article-header">
        <div className="tag-row" style={{ marginBottom: 16 }}>
          {post.tags.map((tag) => (
            <Link className="tag" key={tag} href={`/tags/${tag}`}>
              #{tag}
            </Link>
          ))}
        </div>
        <h1>{post.title}</h1>
        <div className="post-meta">
          <span>{post.author}</span>
          <span className="sep">{formatDate(post.date)}</span>
          <span className="sep">{post.readingTime}</span>
        </div>
      </header>

      <div
        className="article-body"
        dangerouslySetInnerHTML={{ __html: post.contentHtml }}
      />

      <Link href="/" className="back-link">
        ← Zurück zur Übersicht
      </Link>
    </article>
  );
}
