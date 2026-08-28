import Link from "next/link";
import { getDictionary, type Locale } from "@/lib/i18n";

const headlines: Record<Locale, { title: string; body: string }> = {
  en: {
    title: "Your warehouse already has the answers.",
    body: "Connect Columbus and see your first dashboard in under 30 minutes. No credit card required.",
  },
  de: {
    title: "Dein Warehouse hat die Antworten schon.",
    body: "Verbinde Columbus und sieh dein erstes Dashboard in unter 30 Minuten. Keine Kreditkarte nötig.",
  },
  fr: {
    title: "Votre warehouse a déjà les réponses.",
    body: "Connectez Columbus et voyez votre premier tableau de bord en moins de 30 minutes. Sans carte bancaire.",
  },
};

export function CtaBand({ lang }: { lang: Locale }) {
  const t = getDictionary(lang);
  const copy = headlines[lang];
  return (
    <section className="section">
      <div className="container">
        <div className="cta-band">
          <h2>{copy.title}</h2>
          <p>{copy.body}</p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Link className="btn btn-ghost" href={`/${lang}/contact`}>
              {t.hero.primary}
            </Link>
            <Link className="btn btn-ghost" href={`/${lang}/pricing`}>
              {t.nav.pricing}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
