import ArticleCard from "@/app/components/ArticleCard";
import { getRelatedArticles } from "@/lib/articles";

interface RelatedPostsProps {
  slug: string;
  limit?: number;
}

/** Async server component that resolves related articles at render time. */
export default async function RelatedPosts({ slug, limit = 3 }: RelatedPostsProps) {
  const related = await getRelatedArticles(slug, limit);
  if (related.length === 0) return null;

  return (
    <section className="related">
      <h2>Related reading</h2>
      <div className="card-grid">
        {related.map((article) => (
          <ArticleCard key={article.slug} article={article} />
        ))}
      </div>
    </section>
  );
}
