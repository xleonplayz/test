import PostCard from "./components/PostCard";
import Link from "next/link";
import { getAllPosts, getAllTags } from "@/lib/posts";

export default function HomePage() {
  const posts = getAllPosts();
  const tags = getAllTags().slice(0, 8);

  return (
    <>
      <section className="hero">
        <div className="container">
          <h1>Columbus</h1>
          <p>
            Notizen über Softwareentwicklung, Compilerbau und das Web. Geschrieben,
            um Ideen festzuhalten — und um diesen Next.js-Compiler an seine Grenzen
            zu bringen.
          </p>
          {tags.length > 0 && (
            <div className="tag-row" style={{ marginTop: 20 }}>
              {tags.map(({ tag, count }) => (
                <Link className="tag" key={tag} href={`/tags/${tag}`}>
                  #{tag} ({count})
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="container">
        <h2 className="section-title">Neueste Beiträge</h2>
        {posts.length === 0 ? (
          <p className="empty">Noch keine Beiträge vorhanden.</p>
        ) : (
          <div className="post-list">
            {posts.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
