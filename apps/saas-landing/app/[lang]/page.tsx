import { isLocale, getDictionary } from "@/lib/i18n";
import type { LangParams } from "@/lib/types";
import { notFound } from "next/navigation";
import { Hero } from "@/app/sections/Hero";
import { StatsBand } from "@/app/sections/StatsBand";
import { FeatureGrid } from "@/app/sections/FeatureGrid";
import { Testimonials } from "@/app/sections/Testimonials";
import { Faq } from "@/app/sections/Faq";
import { CtaBand } from "@/app/sections/CtaBand";

export default function HomePage({ params }: LangParams) {
  if (!isLocale(params.lang)) notFound();
  const lang = params.lang;
  // Touch the dictionary so the page is clearly locale-aware at the page level.
  void getDictionary(lang).meta.siteName;

  return (
    <>
      <Hero lang={lang} />
      <StatsBand lang={lang} />
      <FeatureGrid lang={lang} limit={6} />
      <Testimonials lang={lang} />
      <Faq lang={lang} />
      <CtaBand lang={lang} />
    </>
  );
}
