import Link from "next/link";

export default function ArticleNotFound() {
  return (
    <div style={{ padding: "48px 0" }}>
      <p className="kicker">404</p>
      <h1 className="page-title">Article not found</h1>
      <p className="muted">
        We couldn&apos;t find that story. It may have been moved or never existed.
      </p>
      <p style={{ marginTop: 20 }}>
        <Link className="btn" href="/">
          Back to the front page
        </Link>
      </p>
    </div>
  );
}
