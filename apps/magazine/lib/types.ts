// Domain types for the News Magazine.
// Heavy use of discriminated unions, generics and literal types to stress the compiler.

export type SectionSlug =
  | "world"
  | "technology"
  | "business"
  | "culture"
  | "science"
  | "opinion";

export interface Section {
  readonly slug: SectionSlug;
  readonly name: string;
  readonly tagline: string;
  /** Accent color used in the section header. */
  readonly accent: string;
  /** Higher = appears further left in the nav. */
  readonly order: number;
}

export interface Author {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly bio: string;
  readonly avatarInitials: string;
  readonly twitter?: string;
}

/**
 * An article block is the structured body of a piece. We model it as a
 * discriminated union so the renderer can switch on `kind` exhaustively.
 */
export type ArticleBlock =
  | { kind: "markdown"; value: string }
  | { kind: "pullquote"; value: string; attribution?: string }
  | { kind: "image"; src: string; alt: string; caption?: string }
  | { kind: "embed"; provider: "code" | "tweet"; value: string };

export type ArticleStatus = "published" | "draft" | "featured";

export interface ArticleMeta {
  readonly slug: string;
  readonly title: string;
  readonly dek: string;
  readonly section: SectionSlug;
  readonly authorId: string;
  /** ISO 8601 date string. */
  readonly publishedAt: string;
  readonly updatedAt?: string;
  readonly tags: readonly string[];
  readonly status: ArticleStatus;
  readonly heroEmoji: string;
}

export interface Article extends ArticleMeta {
  readonly blocks: readonly ArticleBlock[];
}

/** The fully resolved article, ready for rendering (author + section joined). */
export interface ResolvedArticle extends Article {
  readonly author: Author;
  readonly sectionInfo: Section;
  readonly readingMinutes: number;
  readonly plainText: string;
}

// A small generic Result helper, used by data access functions.
export type Result<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

/** Generic paginated container. */
export interface Page<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly pageIndex: number;
  readonly pageSize: number;
  readonly hasNext: boolean;
}

export function paginate<T>(
  all: readonly T[],
  pageIndex: number,
  pageSize: number,
): Page<T> {
  const start = pageIndex * pageSize;
  const items = all.slice(start, start + pageSize);
  return {
    items,
    total: all.length,
    pageIndex,
    pageSize,
    hasNext: start + pageSize < all.length,
  };
}
