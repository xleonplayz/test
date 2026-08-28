import type {
  BlogPost,
  ChangelogEntry,
  FaqItem,
  FeatureItem,
  Testimonial,
} from "@/lib/types";

export const features: FeatureItem[] = [
  {
    id: "warehouse-native",
    icon: "layers",
    category: "ingest",
    title: {
      en: "Warehouse-native by design",
      de: "Warehouse-native von Grund auf",
      fr: "Natif du data warehouse",
    },
    description: {
      en: "Point Columbus at Snowflake, BigQuery or Redshift and query in place — your data never leaves your perimeter.",
      de: "Richte Columbus auf Snowflake, BigQuery oder Redshift und frage direkt ab — deine Daten verlassen nie deinen Perimeter.",
      fr: "Branchez Columbus sur Snowflake, BigQuery ou Redshift et interrogez sur place — vos données ne quittent jamais votre périmètre.",
    },
  },
  {
    id: "auto-sessions",
    icon: "pulse",
    category: "model",
    title: {
      en: "Automatic sessionization",
      de: "Automatische Sessionisierung",
      fr: "Sessionisation automatique",
    },
    description: {
      en: "Raw events become sessions, funnels and journeys without a single line of modeling SQL.",
      de: "Aus Rohdaten werden Sessions, Funnels und Journeys — ohne eine einzige Zeile Modellierungs-SQL.",
      fr: "Les événements bruts deviennent sessions, entonnoirs et parcours sans une ligne de SQL de modélisation.",
    },
  },
  {
    id: "self-serve",
    icon: "compass",
    category: "explore",
    title: {
      en: "Self-serve exploration",
      de: "Self-Service-Exploration",
      fr: "Exploration en self-service",
    },
    description: {
      en: "PMs and marketers answer their own questions with a visual explorer that compiles to optimized SQL.",
      de: "PMs und Marketer beantworten ihre Fragen selbst — mit einem visuellen Explorer, der zu optimiertem SQL kompiliert.",
      fr: "Les PM et marketeurs répondent eux-mêmes via un explorateur visuel qui compile vers du SQL optimisé.",
    },
  },
  {
    id: "realtime",
    icon: "bolt",
    category: "explore",
    title: {
      en: "Sub-second dashboards",
      de: "Sub-Sekunden-Dashboards",
      fr: "Tableaux de bord en moins d'une seconde",
    },
    description: {
      en: "An incremental cache keeps live dashboards under 200ms even across billions of rows.",
      de: "Ein inkrementeller Cache hält Live-Dashboards unter 200ms — auch über Milliarden Zeilen.",
      fr: "Un cache incrémental garde les tableaux de bord sous 200ms, même sur des milliards de lignes.",
    },
  },
  {
    id: "cohorts",
    icon: "graph",
    category: "model",
    title: {
      en: "Cohorts & retention",
      de: "Kohorten & Retention",
      fr: "Cohortes et rétention",
    },
    description: {
      en: "Build retention curves, cohort grids and lifecycle stages with point-and-click definitions.",
      de: "Baue Retention-Kurven, Kohorten-Grids und Lifecycle-Phasen per Klick.",
      fr: "Construisez courbes de rétention, grilles de cohortes et étapes de cycle de vie en quelques clics.",
    },
  },
  {
    id: "governance",
    icon: "shield",
    category: "govern",
    title: {
      en: "Governed metrics layer",
      de: "Governte Metrik-Schicht",
      fr: "Couche de métriques gouvernée",
    },
    description: {
      en: "Define a metric once; every chart, alert and export reads from the same trusted definition.",
      de: "Definiere eine Metrik einmal; jeder Chart, Alert und Export liest aus derselben vertrauten Definition.",
      fr: "Définissez une métrique une fois ; chaque graphique, alerte et export lit la même définition de confiance.",
    },
  },
  {
    id: "security",
    icon: "lock",
    category: "govern",
    title: {
      en: "Enterprise security",
      de: "Enterprise-Sicherheit",
      fr: "Sécurité entreprise",
    },
    description: {
      en: "SSO, SCIM, row-level security and SOC 2 Type II — security that satisfies the toughest review.",
      de: "SSO, SCIM, Row-Level-Security und SOC 2 Type II — Sicherheit, die jedem Review standhält.",
      fr: "SSO, SCIM, sécurité au niveau ligne et SOC 2 Type II — une sécurité qui passe les revues les plus strictes.",
    },
  },
  {
    id: "alerts",
    icon: "spark",
    category: "explore",
    title: {
      en: "Anomaly alerts",
      de: "Anomalie-Alerts",
      fr: "Alertes d'anomalies",
    },
    description: {
      en: "Columbus watches every key metric and pings Slack the moment a number drifts off trend.",
      de: "Columbus überwacht jede Kennzahl und meldet sich in Slack, sobald ein Wert vom Trend abweicht.",
      fr: "Columbus surveille chaque métrique clé et alerte Slack dès qu'un chiffre dévie de la tendance.",
    },
  },
];

export const testimonials: Testimonial[] = [
  {
    id: "t1",
    quote: {
      en: "We retired three dashboards and a weekly data pull. Columbus paid for itself in a month.",
      de: "Wir haben drei Dashboards und einen wöchentlichen Datenexport abgeschafft. Columbus hat sich in einem Monat amortisiert.",
      fr: "Nous avons supprimé trois tableaux de bord et un export hebdomadaire. Columbus s'est rentabilisé en un mois.",
    },
    author: "Mara Vogt",
    role: { en: "VP Product", de: "VP Product", fr: "VP Produit" },
    company: "Northwind",
  },
  {
    id: "t2",
    quote: {
      en: "My PMs stopped filing SQL tickets. That alone freed two analysts.",
      de: "Meine PMs stellen keine SQL-Tickets mehr. Das allein hat zwei Analysten freigespielt.",
      fr: "Mes PM ne créent plus de tickets SQL. Cela a libéré deux analystes à lui seul.",
    },
    author: "Dev Patel",
    role: { en: "Head of Data", de: "Head of Data", fr: "Responsable Data" },
    company: "Lumen",
  },
  {
    id: "t3",
    quote: {
      en: "Warehouse-native meant zero new data copies — security signed off in a day.",
      de: "Warehouse-native bedeutete null neue Datenkopien — Security hat in einem Tag freigegeben.",
      fr: "Le natif warehouse a signifié zéro copie de données — la sécurité a validé en un jour.",
    },
    author: "Sofia Ricci",
    role: { en: "Staff Engineer", de: "Staff Engineer", fr: "Ingénieure principale" },
    company: "Atlas Pay",
  },
];

export const faqs: FaqItem[] = [
  {
    q: {
      en: "Does Columbus copy my data?",
      de: "Kopiert Columbus meine Daten?",
      fr: "Columbus copie-t-il mes données ?",
    },
    a: {
      en: "No. Columbus queries your warehouse in place. Only metadata and cached aggregates live in our control plane.",
      de: "Nein. Columbus fragt dein Warehouse direkt ab. Nur Metadaten und gecachte Aggregate liegen in unserer Control-Plane.",
      fr: "Non. Columbus interroge votre warehouse sur place. Seuls les métadonnées et agrégats en cache vivent dans notre control plane.",
    },
  },
  {
    q: {
      en: "How long does setup take?",
      de: "Wie lange dauert die Einrichtung?",
      fr: "Combien de temps prend la configuration ?",
    },
    a: {
      en: "Most teams connect a warehouse and see their first dashboard within 30 minutes.",
      de: "Die meisten Teams verbinden ein Warehouse und sehen ihr erstes Dashboard in unter 30 Minuten.",
      fr: "La plupart des équipes connectent un warehouse et voient leur premier tableau de bord en moins de 30 minutes.",
    },
  },
  {
    q: {
      en: "Can I switch plans later?",
      de: "Kann ich später den Tarif wechseln?",
      fr: "Puis-je changer d'offre plus tard ?",
    },
    a: {
      en: "Yes — upgrade or downgrade at any time. Annual plans are prorated automatically.",
      de: "Ja — jederzeit up- oder downgraden. Jahrespläne werden automatisch anteilig berechnet.",
      fr: "Oui — changez d'offre à tout moment. Les offres annuelles sont calculées au prorata automatiquement.",
    },
  },
];

export const posts: BlogPost[] = [
  {
    slug: "warehouse-native-analytics",
    title: {
      en: "Why warehouse-native analytics won",
      de: "Warum warehouse-native Analytics gewonnen hat",
      fr: "Pourquoi l'analytique native warehouse a gagné",
    },
    excerpt: {
      en: "The era of shipping a copy of your event data to a third-party silo is over. Here is what replaced it.",
      de: "Die Ära, eine Kopie deiner Event-Daten in ein Silo zu schicken, ist vorbei. Das hat sie abgelöst.",
      fr: "L'ère où l'on envoyait une copie de ses données dans un silo tiers est révolue. Voici ce qui l'a remplacée.",
    },
    body: {
      en: "For a decade, product analytics meant duplicating your event stream into a vendor's database. Warehouse-native flips that: the warehouse you already trust becomes the source of truth, and analytics is just a query layer on top. Less cost, less risk, one definition of every metric.",
      de: "Ein Jahrzehnt lang bedeutete Produkt-Analytics, den Event-Stream in die Datenbank eines Anbieters zu duplizieren. Warehouse-native dreht das um: Das Warehouse, dem du bereits vertraust, wird zur Single Source of Truth, und Analytics ist nur eine Query-Schicht darüber. Weniger Kosten, weniger Risiko, eine Definition pro Metrik.",
      fr: "Pendant une décennie, l'analytique produit consistait à dupliquer votre flux d'événements dans la base d'un fournisseur. Le natif warehouse inverse cela : le warehouse auquel vous faites déjà confiance devient la source de vérité, et l'analytique n'est qu'une couche de requête au-dessus.",
    },
    date: "2026-05-02",
    author: "Mara Vogt",
    tags: ["architecture", "warehouse"],
    readingMinutes: 4,
  },
  {
    slug: "sub-second-dashboards",
    title: {
      en: "How we keep dashboards under 200ms",
      de: "Wie wir Dashboards unter 200ms halten",
      fr: "Comment nous gardons les tableaux de bord sous 200ms",
    },
    excerpt: {
      en: "An incremental aggregate cache, smart query planning and a dash of pre-warming.",
      de: "Ein inkrementeller Aggregat-Cache, schlaue Query-Planung und etwas Pre-Warming.",
      fr: "Un cache d'agrégats incrémental, une planification de requêtes intelligente et un peu de préchauffage.",
    },
    body: {
      en: "Speed is a feature. We maintain incremental materializations keyed by metric definition, plan queries against the smallest covering aggregate, and pre-warm the dashboards a team opens every morning. The result: billion-row dashboards that feel instant.",
      de: "Geschwindigkeit ist ein Feature. Wir pflegen inkrementelle Materialisierungen nach Metrik-Definition, planen Queries gegen das kleinste abdeckende Aggregat und wärmen die Dashboards vor, die ein Team jeden Morgen öffnet. Ergebnis: Milliarden-Zeilen-Dashboards, die sich sofort anfühlen.",
      fr: "La vitesse est une fonctionnalité. Nous maintenons des matérialisations incrémentales par définition de métrique, planifions les requêtes vers le plus petit agrégat couvrant et préchauffons les tableaux de bord ouverts chaque matin.",
    },
    date: "2026-04-18",
    author: "Sofia Ricci",
    tags: ["performance", "engineering"],
    readingMinutes: 6,
  },
  {
    slug: "metrics-layer-governance",
    title: {
      en: "One metric, defined once",
      de: "Eine Metrik, einmal definiert",
      fr: "Une métrique, définie une fois",
    },
    excerpt: {
      en: "How a governed metrics layer ends the 'which number is right?' meeting forever.",
      de: "Wie eine governte Metrik-Schicht das 'welche Zahl stimmt?'-Meeting für immer beendet.",
      fr: "Comment une couche de métriques gouvernée met fin pour toujours à la réunion « quel chiffre est juste ? ».",
    },
    body: {
      en: "Every analytics deployment eventually faces the same crisis: two teams, two definitions of 'active user'. A governed metrics layer means the definition lives once, versioned, reviewed, and every surface reads from it. Disagreements become code review, not meetings.",
      de: "Jedes Analytics-Deployment erlebt irgendwann dieselbe Krise: zwei Teams, zwei Definitionen von 'aktiver Nutzer'. Eine governte Metrik-Schicht heißt: Die Definition existiert einmal, versioniert, reviewt — und jede Oberfläche liest daraus. Uneinigkeit wird zum Code-Review, nicht zum Meeting.",
      fr: "Tout déploiement analytique finit par la même crise : deux équipes, deux définitions d'« utilisateur actif ». Une couche de métriques gouvernée signifie que la définition existe une fois, versionnée, revue, et chaque surface la lit.",
    },
    date: "2026-03-29",
    author: "Dev Patel",
    tags: ["governance", "metrics"],
    readingMinutes: 5,
  },
];

export const changelog: ChangelogEntry[] = [
  {
    version: "3.4.0",
    date: "2026-06-01",
    kind: "feature",
    title: {
      en: "Warehouse-native sessions",
      de: "Warehouse-native Sessions",
      fr: "Sessions natives warehouse",
    },
    notes: [
      { en: "Sessionize events directly in your warehouse.", de: "Sessionisiere Events direkt im Warehouse.", fr: "Sessionisez les événements directement dans votre warehouse." },
      { en: "New session funnels block.", de: "Neuer Session-Funnel-Block.", fr: "Nouveau bloc d'entonnoirs de session." },
    ],
  },
  {
    version: "3.3.2",
    date: "2026-05-12",
    kind: "fix",
    title: {
      en: "Faster cohort rebuilds",
      de: "Schnellere Kohorten-Rebuilds",
      fr: "Reconstruction de cohortes plus rapide",
    },
    notes: [
      { en: "Cut cohort recompute time by 40%.", de: "Kohorten-Neuberechnung um 40% beschleunigt.", fr: "Temps de recalcul des cohortes réduit de 40%." },
    ],
  },
  {
    version: "3.3.0",
    date: "2026-04-20",
    kind: "improvement",
    title: {
      en: "Redesigned explorer",
      de: "Neu gestalteter Explorer",
      fr: "Explorateur repensé",
    },
    notes: [
      { en: "Keyboard-first navigation.", de: "Keyboard-First-Navigation.", fr: "Navigation au clavier d'abord." },
      { en: "Inline SQL preview.", de: "Inline-SQL-Vorschau.", fr: "Aperçu SQL en ligne." },
    ],
  },
];

export function getPost(slug: string): BlogPost | undefined {
  return posts.find((p) => p.slug === slug);
}
