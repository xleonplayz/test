import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Suspense } from "react";
import { getDictionary, isLocale } from "@/lib/i18n";
import type { LangParams } from "@/lib/types";
import { ContactForm } from "@/app/components/ContactForm";
import { SectionHeading } from "@/app/components/SectionHeading";
import { Icon } from "@/app/components/Icon";
import type { IconName } from "@/lib/types";

interface ContactPageProps extends LangParams {
  searchParams: { plan?: string };
}

export async function generateMetadata({ params }: LangParams): Promise<Metadata> {
  if (!isLocale(params.lang)) return {};
  const t = getDictionary(params.lang);
  return { title: t.contact.title, description: t.contact.subtitle };
}

const perks: { icon: IconName; text: Record<string, string> }[] = [
  {
    icon: "bolt",
    text: { en: "First dashboard in 30 minutes", de: "Erstes Dashboard in 30 Minuten", fr: "Premier tableau de bord en 30 minutes" },
  },
  {
    icon: "shield",
    text: { en: "SOC 2 Type II, your data stays put", de: "SOC 2 Type II, deine Daten bleiben", fr: "SOC 2 Type II, vos données restent" },
  },
  {
    icon: "compass",
    text: { en: "Hands-on onboarding included", de: "Hands-on-Onboarding inklusive", fr: "Onboarding accompagné inclus" },
  },
];

export default function ContactPage({ params, searchParams }: ContactPageProps) {
  if (!isLocale(params.lang)) notFound();
  const lang = params.lang;
  const t = getDictionary(lang);

  return (
    <section className="section">
      <div className="container contact-layout">
        <div>
          <SectionHeading title={t.contact.title} subtitle={t.contact.subtitle} />
          <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 16 }}>
            {perks.map((perk) => (
              <li key={perk.icon} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span className="feature-icon" style={{ margin: 0, width: 40, height: 40 }}>
                  <Icon name={perk.icon} size={18} />
                </span>
                <span>{perk.text[lang]}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <Suspense fallback={<p className="muted">{t.common.loading}</p>}>
            <ContactForm lang={lang} dict={t.contact} defaultPlan={searchParams.plan} />
          </Suspense>
        </div>
      </div>
    </section>
  );
}
