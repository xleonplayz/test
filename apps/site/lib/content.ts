// The documentation, bundled as a module by scripts/sync-docs.sh. Nothing here
// reads files, so the pages also work where the app has no file access.
import raw from "./docs.generated";
import { renderMarkdown } from "./markdown";

export type DocMeta = { slug: string; title: string; section: string; order: number };
export type Doc = DocMeta & { html: string };

const docs: Doc[] = (raw as (DocMeta & { body: string })[])
  .map(({ body, ...meta }) => ({ ...meta, html: renderMarkdown(body) }))
  .sort((a, b) => a.order - b.order);

export function allDocs(): Doc[] {
  return docs;
}

export function getDoc(slug: string): Doc | undefined {
  return docs.find((d) => d.slug === slug);
}

export function sections(): [string, DocMeta[]][] {
  const out = new Map<string, DocMeta[]>();
  for (const { html: _html, ...d } of docs) out.set(d.section, [...(out.get(d.section) || []), d]);
  return [...out];
}
