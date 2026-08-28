"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales, type Locale, type NavDict } from "@/lib/i18n";

interface HeaderProps {
  lang: Locale;
  siteName: string;
  nav: NavDict;
}

/**
 * Client header: reads the current pathname to highlight the active link and to
 * compute the locale-preserving sub-path for the language switch.
 */
export function Header({ lang, siteName, nav }: HeaderProps) {
  const pathname = usePathname() ?? `/${lang}`;
  const base = `/${lang}`;

  // Strip the leading locale segment to get the shared sub-path.
  const pathRest = stripLocale(pathname);

  const links: { href: string; label: string }[] = [
    { href: `${base}/features`, label: nav.features },
    { href: `${base}/pricing`, label: nav.pricing },
    { href: `${base}/about`, label: nav.about },
    { href: `${base}/blog`, label: nav.blog },
    { href: `${base}/changelog`, label: nav.changelog },
  ];

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href={base} className="brand" aria-label={`${siteName} home`}>
          <span className="brand-mark" aria-hidden="true" />
          {siteName}
        </Link>

        <nav className="nav" aria-label="Main">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname.startsWith(link.href) ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="nav-actions">
          <nav className="locale-switch" aria-label="Language">
            {locales.map((locale) => (
              <Link
                key={locale}
                href={`/${locale}${pathRest}`}
                aria-current={locale === lang}
                hrefLang={locale}
              >
                {locale.toUpperCase()}
              </Link>
            ))}
          </nav>
          <Link className="btn btn-primary" href={`${base}/contact`}>
            {nav.cta}
          </Link>
        </div>
      </div>
    </header>
  );
}

function stripLocale(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length > 0 && (locales as readonly string[]).includes(segments[0])) {
    const rest = "/" + segments.slice(1).join("/");
    return rest === "/" ? "" : rest;
  }
  return pathname === "/" ? "" : pathname;
}
