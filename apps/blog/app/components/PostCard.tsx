import Link from "next/link";
import { formatDate, type PostMeta } from "@/lib/posts";

export default function PostCard({ post }: { post: PostMeta }) {
  return (
    <Link href={`/posts/${post.slug}`} className="post-card">
      <h2>{post.title}</h2>
      <p>{post.excerpt}</p>
      <div className="post-meta">
        <span>{post.author}</span>
        <span className="sep">{formatDate(post.date)}</span>
        <span className="sep">{post.readingTime}</span>
      </div>
      {post.tags.length > 0 && (
        <div className="tag-row">
          {post.tags.map((tag) => (
            <span className="tag" key={tag}>
              #{tag}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
