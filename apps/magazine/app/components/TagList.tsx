import Link from "next/link";

interface TagListProps {
  tags: readonly string[];
  linkTags?: boolean;
}

export default function TagList({ tags, linkTags = true }: TagListProps) {
  if (tags.length === 0) return null;
  return (
    <div className="tag-row">
      {tags.map((tag) =>
        linkTags ? (
          <Link
            key={tag}
            className="tag-pill"
            href={`/search?q=${encodeURIComponent(tag)}`}
          >
            #{tag}
          </Link>
        ) : (
          <span key={tag} className="tag-pill">
            #{tag}
          </span>
        ),
      )}
    </div>
  );
}
