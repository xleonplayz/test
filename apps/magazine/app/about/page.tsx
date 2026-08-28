import type { Metadata } from "next";
import Link from "next/link";
import Avatar from "@/app/components/Avatar";
import { AUTHORS } from "@/lib/authors";
import { orderedSections } from "@/lib/sections";
import { SITE, absoluteUrl } from "@/lib/site";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "About",
  description: `About ${SITE.name} and the people who write it.`,
  alternates: { canonical: absoluteUrl("/about") },
};

export default function AboutPage() {
  const sections = orderedSections();
  return (
    <>
      <h1 className="page-title">About the Magazine</h1>
      <div className="prose" style={{ fontSize: "1.1rem" }}>
        <p>
          {SITE.name} is an independent publication covering the stories that
          shape the world — and the small ones that explain it. We publish
          across {sections.length} sections, from frontline reporting to
          long-form criticism.
        </p>
        <p>
          We believe in being right over being first. Our newsroom is small,
          opinionated and committed to clarity.
        </p>
        <h2>Our sections</h2>
        <ul>
          {sections.map((s) => (
            <li key={s.slug}>
              <Link href={`/section/${s.slug}`}>{s.name}</Link> — {s.tagline}
            </li>
          ))}
        </ul>
      </div>

      <hr className="divider" />

      <h2 style={{ fontSize: "1.5rem" }}>The newsroom</h2>
      <div className="card-grid">
        {AUTHORS.map((author) => (
          <div className="card" key={author.id}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <Avatar author={author} size={48} />
              <div>
                <h3 style={{ margin: 0, fontSize: "1.1rem" }}>
                  <Link href={`/author/${author.id}`}>{author.name}</Link>
                </h3>
                <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
                  {author.role}
                </p>
              </div>
            </div>
            <p className="card-dek">{author.bio}</p>
          </div>
        ))}
      </div>
    </>
  );
}
