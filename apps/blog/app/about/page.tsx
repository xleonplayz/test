import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Über",
  description: "Worum es bei Columbus geht.",
};

export default function AboutPage() {
  return (
    <div className="container">
      <header className="article-header">
        <h1>Über Columbus</h1>
      </header>
      <div className="article-body prose">
        <p>
          Columbus ist ein kleiner, eigenständiger Blog — gebaut mit dem App
          Router von Next.js, TypeScript und Markdown-Beiträgen mit Frontmatter.
        </p>
        <p>
          Dieses Projekt dient zugleich als Testfall für einen
          Next.js-Compiler: Es kombiniert dynamische Routen, statische
          Generierung (<code>generateStaticParams</code>), Metadaten-APIs,
          serverseitiges Markdown-Rendering und ein komplettes Styling-System.
        </p>
        <h2>Technik</h2>
        <ul>
          <li>Next.js App Router (Server Components)</li>
          <li>Markdown via remark / rehype mit Syntax-Highlighting</li>
          <li>Frontmatter über gray-matter</li>
          <li>Tag-System mit Filterseiten</li>
          <li>Responsives Dark/Light-Theme über CSS-Variablen</li>
        </ul>
      </div>
    </div>
  );
}
