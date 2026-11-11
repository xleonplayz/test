"use client";
import { useEffect, useState } from "react";

type Result = { id: string; title: string; url: string; snippet: string };

// Search as you type, through this site's /api/search (which calls the search API).
export default function Instant() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=5`);
      if (res.ok) setResults((await res.json()).results);
    }, 200);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type to search, e.g. vat rate" style={{ width: "100%", padding: 10, fontSize: 16 }} />
      {results.map((r) => (
        <div key={r.id} className="result">
          <a href={r.url}><strong>{r.title}</strong></a>
          <div className="muted">{r.snippet.replace(/\*\*/g, "")}</div>
        </div>
      ))}
    </div>
  );
}
