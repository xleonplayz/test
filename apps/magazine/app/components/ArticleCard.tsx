import Link from "next/link";
import SectionPill from "@/app/components/SectionPill";
import { excerpt } from "@/lib/markdown";
import { formatDate, readingLabel } from "@/lib/format";
import type { ResolvedArticle } from "@/lib/types";

interface ArticleCardProps {
  article: ResolvedArticle;
  /** Render a larger "lead" variant. */
  lead?: boolean;
  showSection?: boolean;
}

export default function ArticleCard({
  article,
  lead = false,
  showSection = true,
}: ArticleCardProps) {
  return (
    <article className={lead ? "card lead" : "card"}>
      <div className="card-meta" style={{ marginTop: 0 }}>
        {showSection && <SectionPill section={article.sectionInfo} />}
        <span className="hero-emoji" aria-hidden="true">
          {article.heroEmoji}
        </span>
      </div>
      <h3>
        <Link href={`/article/${article.slug}`}>{article.title}</Link>
      </h3>
      <p className="card-dek">
        {lead ? article.dek : excerpt(article.dek || article.plainText, 140)}
      </p>
      <div className="card-meta">
        <span>{article.author.name}</span>
        <span className="dot" />
        <time dateTime={article.publishedAt}>
          {formatDate(article.publishedAt)}
        </time>
        <span className="dot" />
        <span>{readingLabel(article.readingMinutes)}</span>
      </div>
    </article>
  );
}
