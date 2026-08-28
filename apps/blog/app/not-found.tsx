import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container">
      <header className="article-header">
        <h1>404 — Nicht gefunden</h1>
        <p className="prose">
          Diese Seite existiert nicht (mehr). Vielleicht hilft die Startseite
          weiter.
        </p>
      </header>
      <Link href="/" className="back-link">
        ← Zur Startseite
      </Link>
    </div>
  );
}
