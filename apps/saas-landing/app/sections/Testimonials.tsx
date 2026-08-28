import { type Locale } from "@/lib/i18n";
import { testimonials } from "@/lib/content";
import { SectionHeading } from "@/app/components/SectionHeading";

const eyebrows: Record<Locale, { eyebrow: string; title: string }> = {
  en: { eyebrow: "Loved by teams", title: "Don't take our word for it" },
  de: { eyebrow: "Von Teams geliebt", title: "Verlass dich nicht auf unser Wort" },
  fr: { eyebrow: "Adoré par les équipes", title: "Ne nous croyez pas sur parole" },
};

export function Testimonials({ lang }: { lang: Locale }) {
  const copy = eyebrows[lang];
  return (
    <section className="section">
      <div className="container">
        <SectionHeading eyebrow={copy.eyebrow} title={copy.title} />
        <div className="testimonial-grid">
          {testimonials.map((tm) => (
            <figure className="testimonial fade-up" key={tm.id}>
              <blockquote>“{tm.quote[lang]}”</blockquote>
              <figcaption>
                <div className="who">{tm.author}</div>
                <div className="role">
                  {tm.role[lang]} · {tm.company}
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
