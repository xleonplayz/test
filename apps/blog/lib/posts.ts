import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import readingTime from "reading-time";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeHighlight from "rehype-highlight";
import rehypeStringify from "rehype-stringify";

const postsDirectory = path.join(process.cwd(), "posts");

export interface PostFrontmatter {
  title: string;
  date: string;
  excerpt: string;
  author: string;
  tags: string[];
  cover?: string;
}

export interface PostMeta extends PostFrontmatter {
  slug: string;
  readingTime: string;
}

export interface Post extends PostMeta {
  contentHtml: string;
}

function readPostFile(slug: string): { data: PostFrontmatter; content: string } {
  const fullPath = path.join(postsDirectory, `${slug}.md`);
  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);
  return { data: data as PostFrontmatter, content };
}

/** Alle Slugs (Dateinamen ohne .md) im posts-Verzeichnis. */
export function getPostSlugs(): string[] {
  if (!fs.existsSync(postsDirectory)) return [];
  return fs
    .readdirSync(postsDirectory)
    .filter((file) => file.endsWith(".md"))
    .map((file) => file.replace(/\.md$/, ""));
}

/** Metadaten eines Posts (ohne gerenderten HTML-Body). */
export function getPostMeta(slug: string): PostMeta {
  const { data, content } = readPostFile(slug);
  return {
    slug,
    title: data.title ?? slug,
    date: data.date ?? "",
    excerpt: data.excerpt ?? "",
    author: data.author ?? "Unbekannt",
    tags: data.tags ?? [],
    cover: data.cover,
    readingTime: readingTime(content).text,
  };
}

/** Alle Posts als Metadaten, absteigend nach Datum sortiert. */
export function getAllPosts(): PostMeta[] {
  return getPostSlugs()
    .map((slug) => getPostMeta(slug))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** Ein vollständiger Post inkl. gerendertem HTML. */
export async function getPost(slug: string): Promise<Post> {
  const { data, content } = readPostFile(slug);

  const processed = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeHighlight)
    .use(rehypeStringify)
    .process(content);

  return {
    ...getPostMeta(slug),
    title: data.title ?? slug,
    date: data.date ?? "",
    excerpt: data.excerpt ?? "",
    author: data.author ?? "Unbekannt",
    tags: data.tags ?? [],
    cover: data.cover,
    contentHtml: String(processed),
  };
}

/** Alle eindeutigen Tags mit Anzahl der Posts. */
export function getAllTags(): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const post of getAllPosts()) {
    for (const tag of post.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/** Posts gefiltert nach einem Tag. */
export function getPostsByTag(tag: string): PostMeta[] {
  return getAllPosts().filter((post) =>
    post.tags.map((t) => t.toLowerCase()).includes(tag.toLowerCase()),
  );
}

/** Hilfsfunktion: Datum lesbar formatieren (de-DE). */
export function formatDate(dateString: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("de-DE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
