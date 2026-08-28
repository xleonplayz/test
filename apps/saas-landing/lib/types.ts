import type { Locale } from "@/lib/i18n";

/** Shared route params shape for every [lang] page. */
export interface LangParams {
  params: { lang: Locale };
}

/** Discriminated union for pricing cadence. */
export type Cadence = "monthly" | "yearly";

/** A localized text bundle keyed by locale. */
export type LocalizedText = Record<Locale, string>;

export interface PlanPrice {
  monthly: number;
  yearly: number;
}

export interface Plan {
  id: "starter" | "growth" | "scale" | "enterprise";
  name: string;
  price: PlanPrice;
  blurb: LocalizedText;
  features: LocalizedText[];
  highlighted: boolean;
  ctaKind: "self-serve" | "sales";
}

export interface FeatureItem {
  id: string;
  icon: IconName;
  title: LocalizedText;
  description: LocalizedText;
  category: FeatureCategory;
}

export type FeatureCategory = "ingest" | "model" | "explore" | "govern";

export type IconName =
  | "bolt"
  | "graph"
  | "shield"
  | "layers"
  | "compass"
  | "spark"
  | "lock"
  | "pulse";

export interface Testimonial {
  id: string;
  quote: LocalizedText;
  author: string;
  role: LocalizedText;
  company: string;
}

export interface BlogPost {
  slug: string;
  title: LocalizedText;
  excerpt: LocalizedText;
  body: LocalizedText;
  date: string; // ISO
  author: string;
  tags: string[];
  readingMinutes: number;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  kind: "feature" | "fix" | "improvement";
  title: LocalizedText;
  notes: LocalizedText[];
}

export interface FaqItem {
  q: LocalizedText;
  a: LocalizedText;
}

/** Result of the contact server action — discriminated union. */
export type ContactState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string; fieldErrors: Partial<Record<ContactField, string>> };

export type ContactField = "name" | "email" | "company" | "plan" | "message";
