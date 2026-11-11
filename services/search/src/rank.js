// BM25 ranking over the index the indexer serves, with snippets and prefix
// suggestions. Tokenizing must match the indexer (lowercase, stopwords, stems).
const STOP = new Set("a an and are as at be by do for from has in is it its no not of on or our so that the this to we with you your".split(" "));

export function stem(w) {
  for (const s of ["ing", "ed"]) if (w.length > s.length + 3 && w.endsWith(s)) return w.slice(0, -s.length);
  for (const s of ["sses", "ches", "shes", "xes"]) if (w.endsWith(s)) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

export function tokenize(text) {
  return String(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map((w) => stem(w.toLowerCase()))
    .filter((w) => w.length > 1 && !STOP.has(w));
}

export function search(index, query, limit = 10, k1 = 1.2, b = 0.75) {
  const terms = [...new Set(tokenize(query))];
  if (terms.length === 0) return [];
  const N = index.docs.length;
  const scored = [];
  for (const doc of index.docs) {
    let score = 0;
    const matched = [];
    for (const t of terms) {
      const tf = doc.terms[t] || 0;
      if (!tf) continue;
      const df = index.df[t] || 0;
      const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
      score += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * doc.length) / index.avgLength)));
      matched.push(t);
    }
    if (score > 0) scored.push({ doc, score, matched });
  }
  scored.sort((x, y) => y.score - x.score);
  return scored.slice(0, limit).map(({ doc, score, matched }) => ({
    id: doc.id, title: doc.title, section: doc.section, url: doc.url,
    score: Math.round(score * 1000) / 1000, matched, snippet: snippet(doc.text, matched),
  }));
}

// The sentence-sized window around the first matching word, with matches in **…**.
export function snippet(text, matched, width = 160) {
  const words = text.replace(/\n/g, " ").split(" ");
  const hit = words.findIndex((w) => matched.includes(stem(w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ""))));
  const start = Math.max(0, hit - 8);
  let out = "";
  for (let i = start; i < words.length && out.length < width; i++) {
    const w = words[i];
    const norm = stem(w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ""));
    out += (out ? " " : "") + (matched.includes(norm) ? `**${w}**` : w);
  }
  return (start > 0 ? "… " : "") + out + (out.length >= width ? " …" : "");
}

export function suggest(index, prefix, limit = 8) {
  const p = String(prefix).toLowerCase();
  if (!p) return [];
  return Object.entries(index.df)
    .filter(([t]) => t.startsWith(p))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([t]) => t);
}
