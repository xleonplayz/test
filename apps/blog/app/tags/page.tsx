import Link from "next/link";
import type { Metadata } from "next";
import { getAllTags } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Themen",
  description: "Alle Themen des Columbus-Blogs.",
};

export default function TagsPage() {
  const tags = getAllTags();

  return (
    <div className="container">
      <header className="article-header">
        <h1>Themen</h1>
      </header>
      {tags.length === 0 ? (
        <p className="empty">Noch keine Themen vorhanden.</p>
      ) : (
        <div className="tag-cloud">
          {tags.map(({ tag, count }) => (
            <Link className="tag" key={tag} href={`/tags/${tag}`}>
              #{tag} ({count})
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
