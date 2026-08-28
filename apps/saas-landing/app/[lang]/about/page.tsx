import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import type { LangParams } from "@/lib/types";
import { SectionHeading } from "@/app/components/SectionHeading";
import { CtaBand } from "@/app/sections/CtaBand";

export async function generateMetadata({ params }: LangParams): Promise<Metadata> {
  if (!isLocale(params.lang)) return {};
  return { title: getDictionary(params.lang).nav.about };
}

const story: Record<Locale, { title: string; body: string[] }> = {
  en: {
    title: "We believe every team deserves answers, not tickets.",
    body: [
      "Columbus started when three data engineers got tired of being a bottleneck. Every product question became a ticket, every ticket became a queue, and every queue became a quarter.",
      "So we built the platform we wished we had: one that lives in the warehouse, models behavior automatically, and lets anyone ask a question without writing SQL.",
    ],
  },
  de: {
    title: "Wir glauben, dass jedes Team Antworten verdient, keine Tickets.",
    body: [
      "Columbus begann, als drei Data Engineers genug davon hatten, ein Flaschenhals zu sein. Jede Produktfrage wurde ein Ticket, jedes Ticket eine Warteschlange, jede Warteschlange ein Quartal.",
      "Also bauten wir die Plattform, die wir uns gewünscht hätten: eine, die im Warehouse lebt, Verhalten automatisch modelliert und jedem erlaubt, Fragen ohne SQL zu stellen.",
    ],
  },
  fr: {
    title: "Chaque équipe mérite des réponses, pas des tickets.",
    body: [
      "Columbus est né quand trois ingénieurs data en ont eu assez d'être un goulot d'étranglement. Chaque question produit devenait un ticket, chaque ticket une file, chaque file un trimestre.",
      "Nous avons donc construit la plateforme dont nous rêvions : une plateforme dans le warehouse, qui modélise le comportement automatiquement et permet à chacun de poser une question sans SQL.",
    ],
  },
};

const values: Record<Locale, { title: string; desc: string }[]> = {
  en: [
    { title: "Data stays home", desc: "Warehouse-native means we never copy your data into a silo." },
    { title: "Self-serve by default", desc: "If a PM needs an analyst to answer a question, we failed." },
    { title: "One source of truth", desc: "Every metric defined once, versioned, trusted." },
  ],
  de: [
    { title: "Daten bleiben zuhause", desc: "Warehouse-native heißt: Wir kopieren deine Daten nie in ein Silo." },
    { title: "Self-Service zuerst", desc: "Wenn ein PM einen Analysten für eine Frage braucht, haben wir versagt." },
    { title: "Eine Single Source of Truth", desc: "Jede Metrik einmal definiert, versioniert, vertraut." },
  ],
  fr: [
    { title: "Les données restent chez vous", desc: "Le natif warehouse signifie aucune copie dans un silo." },
    { title: "Self-service par défaut", desc: "Si un PM a besoin d'un analyste pour une question, nous avons échoué." },
    { title: "Une source de vérité", desc: "Chaque métrique définie une fois, versionnée, fiable." },
  ],
};

const team = [
  { name: "Mara Vogt", role: "CEO" },
  { name: "Dev Patel", role: "CTO" },
  { name: "Sofia Ricci", role: "Head of Eng" },
  { name: "Jonas Berg", role: "Head of Design" },
];

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function AboutPage({ params }: LangParams) {
  if (!isLocale(params.lang)) notFound();
  const lang = params.lang;
  const s = story[lang];
  const v = values[lang];

  return (
    <>
      <section className="section">
        <div className="container">
          <SectionHeading eyebrow={getDictionary(lang).nav.about} title={s.title} />
          <div className="prose stack-lg">
            {s.body.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="value-grid">
            {v.map((value) => (
              <div className="feature-card fade-up" key={value.title}>
                <h3>{value.title}</h3>
                <p>{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>Team</h2>
          <div className="team-grid">
            {team.map((member) => (
              <div className="feature-card" key={member.name}>
                <div className="avatar" aria-hidden="true">
                  {initials(member.name)}
                </div>
                <div className="who" style={{ fontWeight: 700 }}>
                  {member.name}
                </div>
                <div className="muted">{member.role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CtaBand lang={lang} />
    </>
  );
}
