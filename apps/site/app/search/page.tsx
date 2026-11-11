import { searchApi, type Result } from "@/lib/search";

export const dynamic = "force-dynamic";

function Snippet({ text }: { text: string }) {
  return <>{text.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith("**") ? <mark key={i}>{p.slice(2, -2)}</mark> : p))}</>;
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q || "").trim();
  if (!q) return <p>Type a word into the search box.</p>;
  const r = await searchApi<{ count: number; ms: number; results: Result[]; error?: string }>(`/search?q=${encodeURIComponent(q)}`);
  if (r.status !== 200) return <p>Search is unavailable: {r.body.error}</p>;
  return (
    <>
      <h1>Results for “{q}”</h1>
      <p className="muted">{r.body.count} pages, ranked in {r.body.ms} ms by the search API</p>
      {r.body.results.map((x) => (
        <div key={x.id} className="result">
          <a href={x.url}><strong>{x.title}</strong></a> <span className="muted">· {x.section} · score {x.score}</span>
          <div><Snippet text={x.snippet} /></div>
        </div>
      ))}
    </>
  );
}
