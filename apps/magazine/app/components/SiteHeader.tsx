import Link from "next/link";
import { orderedSections } from "@/lib/sections";
import { SITE } from "@/lib/site";
import ThemeToggleHint from "@/app/components/ThemeToggleHint";

export default function SiteHeader() {
  const sections = orderedSections();
  return (
    <header className="site-header">
      <div className="container">
        <div className="masthead">
          <Link href="/" className="brand">
            {SITE.name}
            <small>Independent journalism since 2026</small>
          </Link>
          <div className="header-actions">
            <ThemeToggleHint />
            <Link className="btn ghost" href="/search">
              Search
            </Link>
          </div>
        </div>
        <nav className="section-nav" aria-label="Sections">
          <Link href="/">Home</Link>
          {sections.map((section) => (
            <Link key={section.slug} href={`/section/${section.slug}`}>
              {section.name}
            </Link>
          ))}
          <Link href="/about">About</Link>
        </nav>
      </div>
    </header>
  );
}
