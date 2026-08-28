import Link from "next/link";
import { locales, type Locale } from "@/lib/i18n";

interface LocaleSwitchProps {
  current: Locale;
  /** Path after the locale segment, e.g. "/pricing" or "" for home. */
  pathRest: string;
}

/**
 * Server component that renders one link per locale, preserving the sub-path.
 * `pathRest` is expected to begin with "/" or be empty.
 */
export function LocaleSwitch({ current, pathRest }: LocaleSwitchProps) {
  return (
    <nav className="locale-switch" aria-label="Language">
      {locales.map((locale) => (
        <Link
          key={locale}
          href={`/${locale}${pathRest}`}
          aria-current={locale === current}
          hrefLang={locale}
        >
          {locale.toUpperCase()}
        </Link>
      ))}
    </nav>
  );
}
