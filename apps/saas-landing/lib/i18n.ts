/**
 * i18n core: supported locales, dictionaries and a typed translator.
 * Deliberately uses discriminated-union-free flat dictionaries plus a
 * generic deep-key lookup to stress the compiler with mapped/indexed types.
 */

export const locales = ["en", "de", "fr"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export interface NavDict {
  home: string;
  features: string;
  pricing: string;
  about: string;
  blog: string;
  changelog: string;
  contact: string;
  cta: string;
}

export interface HeroDict {
  badge: string;
  title: string;
  subtitle: string;
  primary: string;
  secondary: string;
  trustedBy: string;
}

export interface CommonDict {
  loading: string;
  perMonth: string;
  perYear: string;
  mostPopular: string;
  getStarted: string;
  contactSales: string;
  readMore: string;
  backHome: string;
  notFound: string;
  notFoundDesc: string;
}

export interface ContactDict {
  title: string;
  subtitle: string;
  name: string;
  email: string;
  company: string;
  plan: string;
  message: string;
  submit: string;
  submitting: string;
  success: string;
  errorGeneric: string;
  fieldRequired: string;
  emailInvalid: string;
  messageTooShort: string;
}

export interface Dictionary {
  meta: { siteName: string; tagline: string; description: string };
  nav: NavDict;
  hero: HeroDict;
  common: CommonDict;
  contact: ContactDict;
  features: {
    title: string;
    subtitle: string;
  };
  pricing: {
    title: string;
    subtitle: string;
    monthly: string;
    yearly: string;
    yearlyHint: string;
  };
  stats: { label: string; value: string }[];
  footer: { rights: string; madeWith: string };
}

const en: Dictionary = {
  meta: {
    siteName: "Columbus",
    tagline: "Ship product analytics without the data team",
    description:
      "Columbus is the warehouse-native analytics platform that turns raw events into revenue decisions in minutes, not quarters.",
  },
  nav: {
    home: "Home",
    features: "Features",
    pricing: "Pricing",
    about: "About",
    blog: "Blog",
    changelog: "Changelog",
    contact: "Contact",
    cta: "Start free",
  },
  hero: {
    badge: "New · Warehouse-native sessions",
    title: "Turn raw events into revenue decisions.",
    subtitle:
      "Columbus connects directly to your warehouse, models product behavior automatically, and gives every team self-serve answers — no SQL, no waiting on the data team.",
    primary: "Start free",
    secondary: "Book a demo",
    trustedBy: "Trusted by product teams at",
  },
  common: {
    loading: "Loading…",
    perMonth: "/mo",
    perYear: "/yr",
    mostPopular: "Most popular",
    getStarted: "Get started",
    contactSales: "Contact sales",
    readMore: "Read more",
    backHome: "Back to home",
    notFound: "Page not found",
    notFoundDesc: "The page you are looking for has drifted off the map.",
  },
  contact: {
    title: "Talk to us",
    subtitle: "Tell us about your stack and we will get back within one business day.",
    name: "Full name",
    email: "Work email",
    company: "Company",
    plan: "Interested plan",
    message: "How can we help?",
    submit: "Send message",
    submitting: "Sending…",
    success: "Thanks! Your message is on its way — we will reply shortly.",
    errorGeneric: "Something went wrong. Please try again.",
    fieldRequired: "This field is required.",
    emailInvalid: "Please enter a valid work email.",
    messageTooShort: "Please add at least 20 characters so we can help.",
  },
  features: {
    title: "Everything your team needs to understand the product",
    subtitle: "From raw events to executive dashboards — one warehouse-native platform.",
  },
  pricing: {
    title: "Pricing that scales with your insight, not your headcount",
    subtitle: "Start free. Upgrade when the dashboards become indispensable.",
    monthly: "Monthly",
    yearly: "Yearly",
    yearlyHint: "Save 20%",
  },
  stats: [
    { label: "Events / day", value: "9.4B" },
    { label: "Median query", value: "180ms" },
    { label: "Teams onboarded", value: "2,300+" },
    { label: "Uptime", value: "99.98%" },
  ],
  footer: {
    rights: "All rights reserved.",
    madeWith: "Built for product people.",
  },
};

const de: Dictionary = {
  meta: {
    siteName: "Columbus",
    tagline: "Produkt-Analytics ohne eigenes Data-Team",
    description:
      "Columbus ist die warehouse-native Analytics-Plattform, die Rohdaten in Minuten statt Quartalen in Umsatzentscheidungen verwandelt.",
  },
  nav: {
    home: "Start",
    features: "Funktionen",
    pricing: "Preise",
    about: "Über uns",
    blog: "Blog",
    changelog: "Changelog",
    contact: "Kontakt",
    cta: "Kostenlos starten",
  },
  hero: {
    badge: "Neu · Warehouse-native Sessions",
    title: "Aus Rohdaten werden Umsatzentscheidungen.",
    subtitle:
      "Columbus verbindet sich direkt mit deinem Warehouse, modelliert Produktverhalten automatisch und liefert jedem Team Self-Service-Antworten — ohne SQL, ohne Warten auf das Data-Team.",
    primary: "Kostenlos starten",
    secondary: "Demo buchen",
    trustedBy: "Vertraut von Produktteams bei",
  },
  common: {
    loading: "Lädt…",
    perMonth: "/Mon.",
    perYear: "/Jahr",
    mostPopular: "Beliebteste",
    getStarted: "Loslegen",
    contactSales: "Vertrieb kontaktieren",
    readMore: "Weiterlesen",
    backHome: "Zurück zur Startseite",
    notFound: "Seite nicht gefunden",
    notFoundDesc: "Die gesuchte Seite ist von der Karte gerutscht.",
  },
  contact: {
    title: "Sprich mit uns",
    subtitle: "Erzähl uns von deinem Stack — wir melden uns innerhalb eines Werktags.",
    name: "Vollständiger Name",
    email: "Geschäftliche E-Mail",
    company: "Unternehmen",
    plan: "Gewünschter Tarif",
    message: "Wie können wir helfen?",
    submit: "Nachricht senden",
    submitting: "Wird gesendet…",
    success: "Danke! Deine Nachricht ist unterwegs — wir antworten in Kürze.",
    errorGeneric: "Etwas ist schiefgelaufen. Bitte versuche es erneut.",
    fieldRequired: "Dieses Feld ist erforderlich.",
    emailInvalid: "Bitte gib eine gültige geschäftliche E-Mail an.",
    messageTooShort: "Bitte mindestens 20 Zeichen, damit wir helfen können.",
  },
  features: {
    title: "Alles, was dein Team braucht, um das Produkt zu verstehen",
    subtitle: "Von Rohdaten bis zum Vorstands-Dashboard — eine warehouse-native Plattform.",
  },
  pricing: {
    title: "Preise, die mit deiner Erkenntnis skalieren, nicht mit deinem Team",
    subtitle: "Kostenlos starten. Upgraden, wenn die Dashboards unverzichtbar werden.",
    monthly: "Monatlich",
    yearly: "Jährlich",
    yearlyHint: "20% sparen",
  },
  stats: [
    { label: "Events / Tag", value: "9,4 Mrd." },
    { label: "Median-Query", value: "180ms" },
    { label: "Teams onboarded", value: "2.300+" },
    { label: "Verfügbarkeit", value: "99,98%" },
  ],
  footer: {
    rights: "Alle Rechte vorbehalten.",
    madeWith: "Gebaut für Produktmenschen.",
  },
};

const fr: Dictionary = {
  meta: {
    siteName: "Columbus",
    tagline: "L'analytique produit sans équipe data",
    description:
      "Columbus est la plateforme d'analytique native du data warehouse qui transforme les événements bruts en décisions de revenus en minutes, pas en trimestres.",
  },
  nav: {
    home: "Accueil",
    features: "Fonctionnalités",
    pricing: "Tarifs",
    about: "À propos",
    blog: "Blog",
    changelog: "Nouveautés",
    contact: "Contact",
    cta: "Commencer gratuitement",
  },
  hero: {
    badge: "Nouveau · Sessions natives warehouse",
    title: "Transformez les événements bruts en décisions de revenus.",
    subtitle:
      "Columbus se connecte directement à votre data warehouse, modélise automatiquement le comportement produit et donne à chaque équipe des réponses en self-service — sans SQL, sans attendre l'équipe data.",
    primary: "Commencer gratuitement",
    secondary: "Réserver une démo",
    trustedBy: "Adopté par les équipes produit de",
  },
  common: {
    loading: "Chargement…",
    perMonth: "/mois",
    perYear: "/an",
    mostPopular: "Le plus populaire",
    getStarted: "Démarrer",
    contactSales: "Contacter les ventes",
    readMore: "Lire la suite",
    backHome: "Retour à l'accueil",
    notFound: "Page introuvable",
    notFoundDesc: "La page que vous cherchez a dérivé hors de la carte.",
  },
  contact: {
    title: "Parlez-nous",
    subtitle: "Parlez-nous de votre stack, nous répondons sous un jour ouvré.",
    name: "Nom complet",
    email: "E-mail professionnel",
    company: "Entreprise",
    plan: "Offre souhaitée",
    message: "Comment pouvons-nous aider ?",
    submit: "Envoyer le message",
    submitting: "Envoi…",
    success: "Merci ! Votre message est en route — nous répondrons sous peu.",
    errorGeneric: "Une erreur est survenue. Veuillez réessayer.",
    fieldRequired: "Ce champ est obligatoire.",
    emailInvalid: "Veuillez saisir un e-mail professionnel valide.",
    messageTooShort: "Ajoutez au moins 20 caractères pour que nous puissions aider.",
  },
  features: {
    title: "Tout ce dont votre équipe a besoin pour comprendre le produit",
    subtitle: "Des événements bruts aux tableaux de bord exécutifs — une plateforme native warehouse.",
  },
  pricing: {
    title: "Une tarification qui évolue avec vos insights, pas vos effectifs",
    subtitle: "Commencez gratuitement. Évoluez quand les tableaux de bord deviennent indispensables.",
    monthly: "Mensuel",
    yearly: "Annuel",
    yearlyHint: "Économisez 20%",
  },
  stats: [
    { label: "Événements / jour", value: "9,4 Md" },
    { label: "Requête médiane", value: "180ms" },
    { label: "Équipes intégrées", value: "2 300+" },
    { label: "Disponibilité", value: "99,98%" },
  ],
  footer: {
    rights: "Tous droits réservés.",
    madeWith: "Conçu pour les gens du produit.",
  },
};

const dictionaries: Record<Locale, Dictionary> = { en, de, fr };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[defaultLocale];
}

export const localeNames: Record<Locale, string> = {
  en: "English",
  de: "Deutsch",
  fr: "Français",
};
