import Link from "next/link";
import { defaultLocale, getDictionary } from "@/lib/i18n";

/**
 * Global not-found boundary. Because it can render outside a [lang] segment
 * (e.g. for a truly unknown top-level path), it provides its own html/body and
 * falls back to the default locale.
 */
export default function GlobalNotFound() {
  const t = getDictionary(defaultLocale);
  return (
    <html lang={defaultLocale}>
      <body>
        <main id="main">
          <section className="section">
            <div className="container center" style={{ paddingTop: 80 }}>
              <p className="eyebrow" style={{ color: "var(--brand)" }}>
                404
              </p>
              <h1>{t.common.notFound}</h1>
              <p className="muted">{t.common.notFoundDesc}</p>
              <Link className="btn btn-primary" href={`/${defaultLocale}`} style={{ marginTop: 16 }}>
                {t.common.backHome}
              </Link>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
