import "./globals.css";
import type { ReactNode } from "react";
import { sections } from "@/lib/content";

export const metadata = { title: "Leaf & Kettle Docs", description: "API documentation with full-text search" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="top">
          <a className="brand" href="/">Leaf &amp; Kettle Docs</a>
          <form action="/search">
            <input name="q" placeholder="Search the docs" aria-label="Search the docs" />
            <button type="submit">Search</button>
          </form>
        </div>
        <div className="shell">
          <nav className="side">
            {sections().map(([section, docs]) => (
              <div key={section}>
                <h4>{section}</h4>
                {docs.map((d) => <a key={d.slug} href={`/docs/${d.slug}`}>{d.title}</a>)}
              </div>
            ))}
          </nav>
          <article>{children}</article>
        </div>
      </body>
    </html>
  );
}
