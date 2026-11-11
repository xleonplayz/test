// Writes docs/*.md as one JSON module for the site, so the site never reads
// files at run time.
import fs from "node:fs";
import path from "node:path";

const [src, out] = process.argv.slice(2);
const docs = fs.readdirSync(src).filter((f) => f.endsWith(".md")).sort().map((f) => {
  const text = fs.readFileSync(path.join(src, f), "utf8");
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  const meta = {};
  for (const line of (m ? m[1] : "").split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { slug: f.replace(/\.md$/, ""), title: meta.title || f, section: meta.section || "Docs", order: Number(meta.order) || 99, body: m ? text.slice(m[0].length) : text };
});
fs.writeFileSync(out, JSON.stringify(docs, null, 1) + "\n");
console.log(`wrote ${docs.length} documents to ${out}`);
