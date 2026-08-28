import Link from "next/link";
import Avatar from "@/app/components/Avatar";
import { formatDate, readingLabel, relativeTime } from "@/lib/format";
import type { ResolvedArticle } from "@/lib/types";

interface BylineProps {
  article: ResolvedArticle;
  showRelative?: boolean;
}

export default function Byline({ article, showRelative = false }: BylineProps) {
  const { author } = article;
  return (
    <div className="byline">
      <Avatar author={author} />
      <div>
        <div>
          By{" "}
          <Link href={`/author/${author.id}`}>
            <strong>{author.name}</strong>
          </Link>
        </div>
        <div className="muted" style={{ fontSize: "0.82rem" }}>
          <time dateTime={article.publishedAt}>
            {showRelative
              ? relativeTime(article.publishedAt)
              : formatDate(article.publishedAt)}
          </time>
          <span className="dot" />
          {readingLabel(article.readingMinutes)}
        </div>
      </div>
    </div>
  );
}
