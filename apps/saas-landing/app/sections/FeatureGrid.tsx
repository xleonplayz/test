import { getDictionary, type Locale } from "@/lib/i18n";
import { features } from "@/lib/content";
import type { FeatureCategory, FeatureItem } from "@/lib/types";
import { Icon } from "@/app/components/Icon";
import { SectionHeading } from "@/app/components/SectionHeading";

interface FeatureGridProps {
  lang: Locale;
  /** Optional category filter; when omitted, all features render. */
  category?: FeatureCategory;
  withHeading?: boolean;
  limit?: number;
}

export function FeatureGrid({ lang, category, withHeading = true, limit }: FeatureGridProps) {
  const t = getDictionary(lang);
  const list: FeatureItem[] = (category ? features.filter((f) => f.category === category) : features)
    .slice(0, limit ?? features.length);

  return (
    <section className="section" id="features">
      <div className="container">
        {withHeading ? (
          <SectionHeading
            eyebrow={t.nav.features}
            title={t.features.title}
            subtitle={t.features.subtitle}
          />
        ) : null}
        <div className="feature-grid">
          {list.map((feature) => (
            <article className="feature-card fade-up" key={feature.id}>
              <div className="feature-icon">
                <Icon name={feature.icon} />
              </div>
              <h3>{feature.title[lang]}</h3>
              <p>{feature.description[lang]}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
