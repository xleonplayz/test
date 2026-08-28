import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "@/app/components/Header";
import { Footer } from "@/app/components/Footer";
import { getDictionary, isLocale, locales, type Locale } from "@/lib/i18n";
import type { LangParams } from "@/lib/types";

export function generateStaticParams(): { lang: Locale }[] {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LangParams): Promise<Metadata> {
  if (!isLocale(params.lang)) return {};
  const t = getDictionary(params.lang);
  const ogLocale = params.lang === "de" ? "de_DE" : params.lang === "fr" ? "fr_FR" : "en_US";
  return {
    title: {
      default: `${t.meta.siteName} — ${t.meta.tagline}`,
      template: `%s · ${t.meta.siteName}`,
    },
    description: t.meta.description,
    alternates: {
      languages: Object.fromEntries(locales.map((l) => [l, `/${l}`])),
    },
    openGraph: {
      locale: ogLocale,
      title: `${t.meta.siteName} — ${t.meta.tagline}`,
      description: t.meta.description,
    },
  };
}

export default function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { lang: string };
}) {
  if (!isLocale(params.lang)) notFound();
  const lang = params.lang;
  const t = getDictionary(lang);
  const htmlLang = lang === "de" ? "de" : lang === "fr" ? "fr" : "en";

  return (
    <html lang={htmlLang}>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Header lang={lang} siteName={t.meta.siteName} nav={t.nav} />
        <main id="main">{children}</main>
        <Footer lang={lang} />
      </body>
    </html>
  );
}
