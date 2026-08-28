import { type Locale } from "@/lib/i18n";
import { faqs } from "@/lib/content";
import { SectionHeading } from "@/app/components/SectionHeading";

const titles: Record<Locale, string> = {
  en: "Frequently asked questions",
  de: "Häufige Fragen",
  fr: "Questions fréquentes",
};

export function Faq({ lang }: { lang: Locale }) {
  return (
    <section className="section">
      <div className="container">
        <SectionHeading title={titles[lang]} />
        <div className="faq">
          {faqs.map((item, i) => (
            <details key={i} open={i === 0}>
              <summary>{item.q[lang]}</summary>
              <p>{item.a[lang]}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
