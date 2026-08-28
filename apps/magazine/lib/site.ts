export const SITE = {
  name: "The Columbus Magazine",
  shortName: "Columbus",
  description:
    "An independent online magazine covering world affairs, technology, business, culture and science.",
  url: "https://magazine.columbus.example",
  locale: "en-US",
  authorByline: "The Columbus Editorial Team",
} as const;

export type SiteConfig = typeof SITE;

export function absoluteUrl(pathname: string): string {
  const base = SITE.url.replace(/\/$/, "");
  const suffix = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${base}${suffix}`;
}
