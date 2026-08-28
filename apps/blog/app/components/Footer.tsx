import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="container inner">
        <span>© {year} Columbus Blog. Mit Next.js gebaut.</span>
        <span>
          <Link href="/">Start</Link> · <Link href="/tags">Themen</Link> ·{" "}
          <Link href="/about">Über</Link>
        </span>
      </div>
    </footer>
  );
}
