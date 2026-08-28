import type { Metadata } from "next";
import ArticleList from "@/app/components/ArticleList";
import SearchBox from "@/app/components/SearchBox";
import TagList from "@/app/components/TagList";
import { getAllTags, searchArticles } from "@/lib/articles";
import { pluralize } from "@/lib/format";

// Search depends on query params, so it must render dynamically.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search",
  description: "Search every story in The Columbus Magazine.",
  robots: { index: false, follow: true },
};

interface SearchPageProps {
  searchParams: { q?: string | string[] };
}

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const query = firstParam(searchParams.q).trim();
  const [results, tags] = await Promise.all([
    query ? searchArticles(query) : Promise.resolve([]),
    getAllTags(),
  ]);

  return (
    <>
      <h1 className="page-title">Search</h1>
      <SearchBox initialQuery={query} autoFocus />

      {query ? (
        <>
          <p className="muted">
            {pluralize(results.length, "result")} for{" "}
            <strong>&ldquo;{query}&rdquo;</strong>
          </p>
          <ArticleList
            articles={results}
            emptyMessage={`Nothing matched "${query}". Try a different term.`}
          />
        </>
      ) : (
        <>
          <p className="muted">
            Type above to search, or jump in via a popular tag:
          </p>
          <TagList tags={tags} />
        </>
      )}
    </>
  );
}
