import { renderMarkdown } from "@/lib/markdown";

interface MarkdownProps {
  source: string;
}

/**
 * Async server component that renders trusted Markdown (from our own content
 * directory) to HTML. The unified pipeline disallows raw HTML, so the output is
 * safe to inject.
 */
export default async function Markdown({ source }: MarkdownProps) {
  const html = await renderMarkdown(source);
  return (
    <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />
  );
}
