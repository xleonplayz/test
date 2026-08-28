import { notFound } from "next/navigation";
import type { Metadata } from "next";
import PostCard from "@/app/components/PostCard";
import { getAllTags, getPostsByTag } from "@/lib/posts";

export function generateStaticParams() {
  return getAllTags().map(({ tag }) => ({ tag }));
}

export async function generateMetadata({
  params,
}: {
  params: { tag: string };
}): Promise<Metadata> {
  const tag = decodeURIComponent(params.tag);
  return {
    title: `#${tag}`,
    description: `Beiträge zum Thema ${tag}.`,
  };
}

export default function TagPage({ params }: { params: { tag: string } }) {
  const tag = decodeURIComponent(params.tag);
  const posts = getPostsByTag(tag);

  if (posts.length === 0) {
    notFound();
  }

  return (
    <div className="container">
      <header className="article-header">
        <h1>#{tag}</h1>
        <p className="post-meta">
          {posts.length} {posts.length === 1 ? "Beitrag" : "Beiträge"}
        </p>
      </header>
      <div className="post-list">
        {posts.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>
    </div>
  );
}
