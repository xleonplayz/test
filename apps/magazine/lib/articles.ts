import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import readingTime from "reading-time";

import type {
  Article,
  ArticleBlock,
  ArticleMeta,
  ArticleStatus,
  ResolvedArticle,
  Result,
  SectionSlug,
} from "@/lib/types";
import { err, ok } from "@/lib/types";
import { getSection, isSectionSlug } from "@/lib/sections";
import { requireAuthor } from "@/lib/authors";
import { toPlainText } from "@/lib/markdown";

const CONTENT_DIR = path.join(process.cwd(), "content");

interface FrontMatter {
  title: string;
  dek: string;
  section: string;
  authorId: string;
  publishedAt: string;
  updatedAt?: string;
  tags?: string[];
  status?: ArticleStatus;
  heroEmoji?: string;
}

// Module-level cache so repeated calls during a single render don't re-read disk.
let cache: Article[] | null = null;

function asSection(value: string): SectionSlug {
  return isSectionSlug(value) ? value : "world";
}

function parseBlocks(body: string): ArticleBlock[] {
  // The whole markdown body is one markdown block in this model; we still wrap it
  // in the discriminated-union shape so the renderer stays uniform.
  return [{ kind: "markdown", value: body.trim() }];
}

async function loadAll(): Promise<Article[]> {
  if (cache) return cache;

  let files: string[] = [];
  try {
    files = (await fs.readdir(CONTENT_DIR)).filter((f) => f.endsWith(".md"));
  } catch {
    files = [];
  }

  const articles: Article[] = [];
  for (const file of files) {
    const slug = file.replace(/\.md$/, "");
    const raw = await fs.readFile(path.join(CONTENT_DIR, file), "utf8");
    const { data, content } = matter(raw);
    const fm = data as FrontMatter;

    const meta: ArticleMeta = {
      slug,
      title: fm.title ?? slug,
      dek: fm.dek ?? "",
      section: asSection(fm.section ?? "world"),
      authorId: fm.authorId ?? "editorial-board",
      publishedAt: fm.publishedAt ?? new Date(0).toISOString(),
      updatedAt: fm.updatedAt,
      tags: fm.tags ?? [],
      status: fm.status ?? "published",
      heroEmoji: fm.heroEmoji ?? "📰",
    };

    articles.push({ ...meta, blocks: parseBlocks(content) });
  }

  articles.sort(
    (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
  );
  cache = articles;
  return articles;
}

function markdownOf(article: Article): string {
  return article.blocks
    .filter((b): b is Extract<ArticleBlock, { kind: "markdown" }> =>
      b.kind === "markdown",
    )
    .map((b) => b.value)
    .join("\n\n");
}

function resolve(article: Article): ResolvedArticle {
  const md = markdownOf(article);
  const plainText = toPlainText(md);
  const stats = readingTime(plainText);
  return {
    ...article,
    author: requireAuthor(article.authorId),
    sectionInfo: getSection(article.section)!,
    readingMinutes: Math.max(1, Math.round(stats.minutes)),
    plainText,
  };
}

export async function getAllArticles(): Promise<ResolvedArticle[]> {
  const all = await loadAll();
  return all.map(resolve);
}

export async function getPublishedArticles(): Promise<ResolvedArticle[]> {
  const all = await getAllArticles();
  return all.filter((a) => a.status !== "draft");
}

export async function getArticleBySlug(
  slug: string,
): Promise<Result<ResolvedArticle>> {
  const all = await loadAll();
  const found = all.find((a) => a.slug === slug);
  if (!found) return err(`No article with slug "${slug}"`);
  return ok(resolve(found));
}

export async function getRawMarkdown(slug: string): Promise<string | null> {
  const all = await loadAll();
  const found = all.find((a) => a.slug === slug);
  return found ? markdownOf(found) : null;
}

export async function getArticlesBySection(
  section: SectionSlug,
): Promise<ResolvedArticle[]> {
  const all = await getPublishedArticles();
  return all.filter((a) => a.section === section);
}

export async function getFeatured(): Promise<ResolvedArticle[]> {
  const all = await getPublishedArticles();
  return all.filter((a) => a.status === "featured");
}

export async function getArticlesByAuthor(
  authorId: string,
): Promise<ResolvedArticle[]> {
  const all = await getPublishedArticles();
  return all.filter((a) => a.authorId === authorId);
}

/**
 * Related articles: same section first, then shared tags, scored and ranked.
 * Generic-free but deliberately non-trivial to exercise the compiler.
 */
export async function getRelatedArticles(
  slug: string,
  limit = 3,
): Promise<ResolvedArticle[]> {
  const all = await getPublishedArticles();
  const current = all.find((a) => a.slug === slug);
  if (!current) return [];

  const currentTags = new Set(current.tags);

  const scored = all
    .filter((a) => a.slug !== slug)
    .map((a) => {
      let score = 0;
      if (a.section === current.section) score += 3;
      for (const tag of a.tags) if (currentTags.has(tag)) score += 2;
      if (a.authorId === current.authorId) score += 1;
      return { article: a, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((x, y) => {
      if (y.score !== x.score) return y.score - x.score;
      return Date.parse(y.article.publishedAt) - Date.parse(x.article.publishedAt);
    });

  return scored.slice(0, limit).map((entry) => entry.article);
}

export async function searchArticles(
  query: string,
): Promise<ResolvedArticle[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const all = await getPublishedArticles();
  return all.filter((a) => {
    const haystack = [
      a.title,
      a.dek,
      a.plainText,
      a.author.name,
      a.sectionInfo.name,
      ...a.tags,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export async function getAllTags(): Promise<readonly string[]> {
  const all = await getPublishedArticles();
  const tags = new Set<string>();
  for (const a of all) for (const t of a.tags) tags.add(t);
  return [...tags].sort();
}

export async function getAllSlugs(): Promise<readonly string[]> {
  const all = await loadAll();
  return all.map((a) => a.slug);
}
