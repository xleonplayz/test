import { allDocs } from "@/lib/content";
import Instant from "./instant";

export const dynamic = "force-static";

export default function Home() {
  return (
    <>
      <h1>Leaf &amp; Kettle API documentation</h1>
      <p>Build a storefront on the Leaf &amp; Kettle catalog: list teas, fill carts, quote taxes and place orders.</p>
      <Instant />
      <h2>All pages</h2>
      <ul>
        {allDocs().map((d) => (
          <li key={d.slug}><a href={`/docs/${d.slug}`}>{d.title}</a> <span className="muted">· {d.section}</span></li>
        ))}
      </ul>
    </>
  );
}
