import { cookies, headers } from "next/headers";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isLocale,
  localeFromAcceptLanguage,
  type Locale,
} from "./locales";
import { en, type Messages } from "./dictionaries/en";
import { tw } from "./dictionaries/tw";

const DICTIONARIES: Record<Locale, Messages> = { en, tw };

export function getDict(locale: Locale): Messages {
  return DICTIONARIES[locale] ?? en;
}

/**
 * Resolve the active locale for the current request.
 *   1. Explicit cookie (user's choice via the switcher)
 *   2. Accept-Language header (best automatic guess)
 *   3. Default (English)
 *
 * Safe to call in any server component / action. Never throws — falls back
 * to English if cookies/headers are unavailable.
 */
export async function getLocale(): Promise<Locale> {
  try {
    const cookieStore = await cookies();
    const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value;
    if (isLocale(fromCookie)) return fromCookie;

    const headerStore = await headers();
    return localeFromAcceptLanguage(headerStore.get("accept-language"));
  } catch {
    return DEFAULT_LOCALE;
  }
}

/** Convenience: resolve the locale and its dictionary in one call. */
export async function getTranslations(): Promise<{
  locale: Locale;
  t: Messages;
}> {
  const locale = await getLocale();
  return { locale, t: getDict(locale) };
}

export type { Locale, Messages };
