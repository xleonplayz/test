import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getDictionary, isLocale } from "@/lib/i18n";
import type { LangParams } from "@/lib/types";
import type { FeatureCategory } from "@/lib/types";
import { FeatureGrid } from "@/app/sections/FeatureGrid";
import { CtaBand } from "@/app/sections/CtaBand";
import { SectionHeading } from "@/app/components/SectionHeading";

export async function generateMetadata({ params }: LangParams): Promise<Metadata> {
  if (!isLocale(params.lang)) return {};
  const t = getDictionary(params.lang);
  return { title: t.nav.features, description: t.features.subtitle };
}

const categoryLabels: Record<string, Record<FeatureCategory, string>> = {
  en: { ingest: "Ingest", model: "Model", explore: "Explore", govern: "Govern" },
  de: { ingest: "Erfassen", model: "Modellieren", explore: "Erkunden", govern: "Governance" },
  fr: { ingest: "Ingestion", model: "Modélisation", explore: "Exploration", govern: "Gouvernance" },
};

const categories: FeatureCategory[] = ["ingest", "model", "explore", "govern"];

export default function FeaturesPage({ params }: LangParams) {
  if (!isLocale(params.lang)) notFound();
  const lang = params.lang;
  const t = getDictionary(lang);
  const labels = categoryLabels[lang];

  return (
    <>
      <section className="section" style={{ paddingBottom: 0 }}>
        <div className="container">
          <SectionHeading eyebrow={t.nav.features} title={t.features.title} subtitle={t.features.subtitle} />
        </div>
      </section>

      {categories.map((category) => (
        <section className="section" key={category} style={{ paddingTop: 24 }}>
          <div className="container">
            <h3 style={{ marginBottom: 18 }}>{labels[category]}</h3>
            <FeatureGrid lang={lang} category={category} withHeading={false} />
          </div>
        </section>
      ))}

      <CtaBand lang={lang} />
    </>
  );
}
