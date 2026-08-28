import type { Cadence, Plan } from "@/lib/types";
import type { Locale as L } from "@/lib/i18n";

export const plans: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price: { monthly: 0, yearly: 0 },
    blurb: {
      en: "For side projects and early validation.",
      de: "Für Nebenprojekte und frühe Validierung.",
      fr: "Pour les projets perso et la validation précoce.",
    },
    features: [
      { en: "Up to 1M events / month", de: "Bis zu 1 Mio. Events / Monat", fr: "Jusqu'à 1M d'événements / mois" },
      { en: "3 seats", de: "3 Plätze", fr: "3 sièges" },
      { en: "7-day data retention", de: "7 Tage Datenaufbewahrung", fr: "Rétention de 7 jours" },
      { en: "Community support", de: "Community-Support", fr: "Support communautaire" },
    ],
    highlighted: false,
    ctaKind: "self-serve",
  },
  {
    id: "growth",
    name: "Growth",
    price: { monthly: 89, yearly: 854 },
    blurb: {
      en: "For teams shipping weekly.",
      de: "Für Teams, die wöchentlich ausliefern.",
      fr: "Pour les équipes qui livrent chaque semaine.",
    },
    features: [
      { en: "Up to 25M events / month", de: "Bis zu 25 Mio. Events / Monat", fr: "Jusqu'à 25M d'événements / mois" },
      { en: "15 seats", de: "15 Plätze", fr: "15 sièges" },
      { en: "12-month retention", de: "12 Monate Aufbewahrung", fr: "Rétention de 12 mois" },
      { en: "Warehouse sync", de: "Warehouse-Sync", fr: "Synchro warehouse" },
      { en: "Priority email support", de: "Priorisierter E-Mail-Support", fr: "Support e-mail prioritaire" },
    ],
    highlighted: true,
    ctaKind: "self-serve",
  },
  {
    id: "scale",
    name: "Scale",
    price: { monthly: 349, yearly: 3350 },
    blurb: {
      en: "For data-driven orgs at scale.",
      de: "Für datengetriebene Organisationen im Maßstab.",
      fr: "Pour les organisations data à grande échelle.",
    },
    features: [
      { en: "Up to 250M events / month", de: "Bis zu 250 Mio. Events / Monat", fr: "Jusqu'à 250M d'événements / mois" },
      { en: "Unlimited seats", de: "Unbegrenzte Plätze", fr: "Sièges illimités" },
      { en: "36-month retention", de: "36 Monate Aufbewahrung", fr: "Rétention de 36 mois" },
      { en: "RBAC & audit logs", de: "RBAC & Audit-Logs", fr: "RBAC et journaux d'audit" },
      { en: "Dedicated success manager", de: "Dedizierter Success-Manager", fr: "Customer success dédié" },
    ],
    highlighted: false,
    ctaKind: "self-serve",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: { monthly: -1, yearly: -1 },
    blurb: {
      en: "Custom volume, residency and SLAs.",
      de: "Individuelles Volumen, Residency und SLAs.",
      fr: "Volume, résidence et SLA sur mesure.",
    },
    features: [
      { en: "Unlimited events", de: "Unbegrenzte Events", fr: "Événements illimités" },
      { en: "SSO / SCIM", de: "SSO / SCIM", fr: "SSO / SCIM" },
      { en: "Data residency", de: "Data Residency", fr: "Résidence des données" },
      { en: "99.99% SLA", de: "99,99% SLA", fr: "SLA 99,99%" },
      { en: "On-prem warehouse option", de: "On-Prem-Warehouse-Option", fr: "Option warehouse on-prem" },
    ],
    highlighted: false,
    ctaKind: "sales",
  },
];

/** Format a plan price for a given cadence and locale. Returns null for "contact us". */
export function formatPrice(plan: Plan, cadence: Cadence, locale: L): string | null {
  const amount = plan.price[cadence];
  if (amount < 0) return null;
  if (amount === 0) return locale === "de" ? "Kostenlos" : locale === "fr" ? "Gratuit" : "Free";
  const fmt = new Intl.NumberFormat(locale === "de" ? "de-DE" : locale === "fr" ? "fr-FR" : "en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
  // yearly stored as the already-discounted annual total → show monthly equivalent
  const display = cadence === "yearly" ? Math.round(amount / 12) : amount;
  return fmt.format(display);
}

export function getPlan(id: Plan["id"]): Plan | undefined {
  return plans.find((p) => p.id === id);
}
