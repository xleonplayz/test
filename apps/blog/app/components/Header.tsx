import Link from "next/link";

export default function Header() {
  return (
    <header className="site-header">
      <div className="container inner">
        <Link href="/" className="brand">
          Columbus<span className="dot">.</span>
        </Link>
        <nav className="nav">
          <Link href="/">Start</Link>
          <Link href="/tags">Themen</Link>
          <Link href="/about">Über</Link>
        </nav>
      </div>
    </header>
  );
}
