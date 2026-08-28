import Link from "next/link";
import { getDictionary, type Locale } from "@/lib/i18n";
import { LocaleSwitch } from "@/app/components/LocaleSwitch";

interface FooterProps {
  lang: Locale;
}

export function Footer({ lang }: FooterProps) {
  const t = getDictionary(lang);
  const base = `/${lang}`;
  const year = new Date().getFullYear();

  const columns: { title: string; links: { href: string; label: string }[] }[] = [
    {
      title: t.nav.features,
      links: [
        { href: `${base}/features`, label: t.nav.features },
        { href: `${base}/pricing`, label: t.nav.pricing },
        { href: `${base}/changelog`, label: t.nav.changelog },
      ],
    },
    {
      title: t.nav.about,
      links: [
        { href: `${base}/about`, label: t.nav.about },
        { href: `${base}/blog`, label: t.nav.blog },
        { href: `${base}/contact`, label: t.nav.contact },
      ],
    },
    {
      title: "Legal",
      links: [
        { href: `${base}/about`, label: "Privacy" },
        { href: `${base}/about`, label: "Terms" },
        { href: `${base}/about`, label: "Security" },
      ],
    },
  ];

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-col">
            <div className="brand" style={{ marginBottom: 12 }}>
              <span className="brand-mark" aria-hidden="true" />
              {t.meta.siteName}
            </div>
            <p className="muted" style={{ maxWidth: "34ch" }}>
              {t.meta.tagline}
            </p>
          </div>
          {columns.map((col) => (
            <div className="footer-col" key={col.title}>
              <h4>{col.title}</h4>
              {col.links.map((link, i) => (
                <Link key={`${link.href}-${i}`} href={link.href}>
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
        <div className="footer-bottom">
          <span>
            © {year} {t.meta.siteName}. {t.footer.rights}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span>{t.footer.madeWith}</span>
            <LocaleSwitch current={lang} pathRest="" />
          </div>
        </div>
      </div>
    </footer>
  );
}
