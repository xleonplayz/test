import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getDictionary, isLocale } from "@/lib/i18n";
import type { LangParams } from "@/lib/types";
import { PricingTable } from "@/app/components/PricingTable";
import { Faq } from "@/app/sections/Faq";
import { CtaBand } from "@/app/sections/CtaBand";
import { SectionHeading } from "@/app/components/SectionHeading";

export async function generateMetadata({ params }: LangParams): Promise<Metadata> {
  if (!isLocale(params.lang)) return {};
  const t = getDictionary(params.lang);
  return { title: t.nav.pricing, description: t.pricing.subtitle };
}

export default function PricingPage({ params }: LangParams) {
  if (!isLocale(params.lang)) notFound();
  const lang = params.lang;
  const t = getDictionary(lang);

  return (
    <>
      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow={t.nav.pricing}
            title={t.pricing.title}
            subtitle={t.pricing.subtitle}
            align="center"
          />
          <PricingTable
            lang={lang}
            labels={{
              monthly: t.pricing.monthly,
              yearly: t.pricing.yearly,
              yearlyHint: t.pricing.yearlyHint,
              perMonth: t.common.perMonth,
              mostPopular: t.common.mostPopular,
              getStarted: t.common.getStarted,
              contactSales: t.common.contactSales,
            }}
          />
        </div>
      </section>

      <Faq lang={lang} />
      <CtaBand lang={lang} />
    </>
  );
}
