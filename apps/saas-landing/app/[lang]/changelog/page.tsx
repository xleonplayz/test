import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import type { LangParams } from "@/lib/types";
import { changelog } from "@/lib/content";
import { SectionHeading } from "@/app/components/SectionHeading";

export async function generateMetadata({ params }: LangParams): Promise<Metadata> {
  if (!isLocale(params.lang)) return {};
  return { title: getDictionary(params.lang).nav.changelog };
}

function formatDate(iso: string, lang: Locale): string {
  const locale = lang === "de" ? "de-DE" : lang === "fr" ? "fr-FR" : "en-US";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(iso));
}

export default function ChangelogPage({ params }: LangParams) {
  if (!isLocale(params.lang)) notFound();
  const lang = params.lang;
  const t = getDictionary(lang);

  return (
    <section className="section">
      <div className="container">
        <SectionHeading eyebrow={t.nav.changelog} title={t.nav.changelog} />
        <div className="timeline">
          {changelog.map((entry) => (
            <div className="timeline-item" key={entry.version}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 4 }}>
                <span className={`kind-pill kind-${entry.kind}`}>{entry.kind}</span>
                <strong>v{entry.version}</strong>
                <span className="muted">{formatDate(entry.date, lang)}</span>
              </div>
              <h3>{entry.title[lang]}</h3>
              <ul>
                {entry.notes.map((note, i) => (
                  <li key={i}>{note[lang]}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
