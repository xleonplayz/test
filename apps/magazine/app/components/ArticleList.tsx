import ArticleCard from "@/app/components/ArticleCard";
import type { ResolvedArticle } from "@/lib/types";

interface ArticleListProps {
  articles: readonly ResolvedArticle[];
  emptyMessage?: string;
  showSection?: boolean;
}

export default function ArticleList({
  articles,
  emptyMessage = "No articles yet.",
  showSection = true,
}: ArticleListProps) {
  if (articles.length === 0) {
    return <p className="muted">{emptyMessage}</p>;
  }
  return (
    <div className="card-grid">
      {articles.map((article) => (
        <ArticleCard
          key={article.slug}
          article={article}
          showSection={showSection}
        />
      ))}
    </div>
  );
}
