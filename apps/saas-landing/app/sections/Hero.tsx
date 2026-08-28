import Link from "next/link";
import { getDictionary, type Locale } from "@/lib/i18n";

interface HeroProps {
  lang: Locale;
}

const logos = ["Northwind", "Lumen", "Atlas Pay", "Vertex", "Cobalt"];

export function Hero({ lang }: HeroProps) {
  const t = getDictionary(lang);
  return (
    <section className="hero">
      <div className="container">
        <span className="badge">
          <span className="dot" aria-hidden="true" />
          {t.hero.badge}
        </span>
        <h1 className="fade-up">{t.hero.title}</h1>
        <p className="hero-sub fade-up">{t.hero.subtitle}</p>
        <div className="hero-actions fade-up">
          <Link className="btn btn-primary" href={`/${lang}/contact`}>
            {t.hero.primary}
          </Link>
          <Link className="btn btn-ghost" href={`/${lang}/features`}>
            {t.hero.secondary}
          </Link>
        </div>
        <div className="hero-logos">
          <small>{t.hero.trustedBy}</small>
          {logos.map((logo) => (
            <span key={logo}>{logo}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
