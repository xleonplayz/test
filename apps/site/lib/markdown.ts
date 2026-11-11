// A small Markdown renderer for the docs: headings, paragraphs, lists, tables,
// fenced code, inline code, bold and links. Input is our own content.
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function inline(s: string): string {
  const parts = s.split(/(`[^`]+`)/g);
  return parts
    .map((p) =>
      p.startsWith("`") && p.endsWith("`") && p.length > 1
        ? `<code>${esc(p.slice(1, -1))}</code>`
        : esc(p)
            .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
            .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>'),
    )
    .join("");
}

export const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function renderMarkdown(src: string): string {
  const lines = src.split("\n");
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("```")) {
      const code: string[] = [];
      for (i++; i < lines.length && !lines[i].startsWith("```"); i++) code.push(lines[i]);
      i++;
      out.push(`<pre><code>${esc(code.join("\n"))}</code></pre>`);
    } else if (/^#{1,3} /.test(line)) {
      const level = line.match(/^#+/)![0].length;
      const text = line.slice(level + 1).trim();
      out.push(`<h${level} id="${slugify(text)}">${inline(text)}</h${level}>`);
      i++;
    } else if (line.startsWith("|")) {
      const rows: string[][] = [];
      for (; i < lines.length && lines[i].startsWith("|"); i++) {
        if (/^\|[-\s|:]+\|$/.test(lines[i])) continue;
        rows.push(lines[i].slice(1, -1).split("|").map((c) => c.trim()));
      }
      const [head, ...body] = rows;
      out.push(
        `<table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>` +
          body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("") +
          "</tbody></table>",
      );
    } else if (/^(- |\d+\. )/.test(line)) {
      const ordered = /^\d+\. /.test(line);
      const items: string[] = [];
      for (; i < lines.length && /^(- |\d+\. |   )/.test(lines[i]); i++) {
        if (lines[i].startsWith("   ")) items[items.length - 1] += " " + lines[i].trim();
        else items.push(lines[i].replace(/^(- |\d+\. )/, ""));
      }
      const tag = ordered ? "ol" : "ul";
      out.push(`<${tag}>${items.map((t) => `<li>${inline(t)}</li>`).join("")}</${tag}>`);
    } else if (line.trim() === "") {
      i++;
    } else {
      const para: string[] = [];
      for (; i < lines.length && lines[i].trim() !== "" && !/^(```|#|\||- |\d+\. )/.test(lines[i]); i++) para.push(lines[i]);
      out.push(`<p>${inline(para.join(" "))}</p>`);
    }
  }
  return out.join("\n");
}
