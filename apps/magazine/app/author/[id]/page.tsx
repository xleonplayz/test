import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Avatar from "@/app/components/Avatar";
import ArticleList from "@/app/components/ArticleList";
import { getArticlesByAuthor } from "@/lib/articles";
import { AUTHORS, getAuthor } from "@/lib/authors";
import { absoluteUrl } from "@/lib/site";
import { pluralize } from "@/lib/format";

export const revalidate = 1800;
export const dynamicParams = false;

interface AuthorPageProps {
  params: { id: string };
}

export function generateStaticParams(): { id: string }[] {
  return AUTHORS.map((a) => ({ id: a.id }));
}

export async function generateMetadata({
  params,
}: AuthorPageProps): Promise<Metadata> {
  const author = getAuthor(params.id);
  if (!author) return { title: "Author not found" };
  return {
    title: author.name,
    description: author.bio,
    alternates: { canonical: absoluteUrl(`/author/${author.id}`) },
    openGraph: {
      title: `${author.name} · The Columbus Magazine`,
      description: author.bio,
      url: absoluteUrl(`/author/${author.id}`),
    },
  };
}

export default async function AuthorPage({ params }: AuthorPageProps) {
  const author = getAuthor(params.id);
  if (!author) notFound();

  const articles = await getArticlesByAuthor(author.id);

  return (
    <>
      <p className="breadcrumbs">
        <a href="/">Home</a> / Authors / {author.name}
      </p>
      <header
        style={{
          display: "flex",
          gap: 18,
          alignItems: "center",
          margin: "20px 0 8px",
        }}
      >
        <Avatar author={author} size={72} />
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>
            {author.name}
          </h1>
          <p className="muted" style={{ margin: "4px 0 0" }}>
            {author.role}
            {author.twitter ? ` · @${author.twitter}` : ""}
          </p>
        </div>
      </header>
      <p className="dek" style={{ maxWidth: 640 }}>
        {author.bio}
      </p>

      <hr className="divider" />

      <h2 style={{ fontSize: "1.4rem" }}>
        {pluralize(articles.length, "story", "stories")} by {author.name}
      </h2>
      <ArticleList
        articles={articles}
        emptyMessage={`${author.name} hasn't published anything yet.`}
      />
    </>
  );
}
