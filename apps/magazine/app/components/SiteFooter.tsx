import Link from "next/link";
import { orderedSections } from "@/lib/sections";
import { SITE } from "@/lib/site";

export default function SiteFooter() {
  const sections = orderedSections();
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <h4>{SITE.shortName}</h4>
            <p style={{ marginTop: 0 }}>{SITE.description}</p>
            <p className="muted">
              © {year} {SITE.name}. All rights reserved.
            </p>
          </div>
          <div>
            <h4>Sections</h4>
            <ul>
              {sections.map((s) => (
                <li key={s.slug}>
                  <Link href={`/section/${s.slug}`}>{s.name}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4>More</h4>
            <ul>
              <li>
                <Link href="/about">About us</Link>
              </li>
              <li>
                <Link href="/search">Search</Link>
              </li>
              <li>
                <a href="/feed.xml">RSS feed</a>
              </li>
              <li>
                <a href="/sitemap.xml">Sitemap</a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
