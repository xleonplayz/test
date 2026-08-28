import { getDictionary, type Locale } from "@/lib/i18n";

export function StatsBand({ lang }: { lang: Locale }) {
  const t = getDictionary(lang);
  return (
    <section className="section" aria-label="Key numbers">
      <div className="container">
        <div className="stats">
          {t.stats.map((stat) => (
            <div className="stat fade-up" key={stat.label}>
              <div className="value">{stat.value}</div>
              <div className="label">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
