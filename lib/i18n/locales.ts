/**
 * UI locales. Distinct from the languages a candidate *speaks* (that list
 * lives in lib/ghana.ts) — this is which language the interface renders in.
 *
 * We launch with English + Twi (Akan), the two most widely understood in the
 * Accra/Kumasi pilot region. Ga, Ewe, Dagbani, and Hausa are registered in
 * the type system and ready to add once native-speaker translations are QA'd
 * — they intentionally are NOT in SELECTABLE_LOCALES until then, because a
 * half-translated or machine-translated safety warning is worse than English.
 */
export const LOCALES = ["en", "tw"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_COOKIE = "gyj_locale";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  tw: "Twi",
};

/** Locales offered in the switcher. */
export const SELECTABLE_LOCALES: readonly Locale[] = LOCALES;

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

/**
 * Pick the best locale from an Accept-Language header. Falls back to the
 * default. Only matches locales we actually ship.
 */
export function localeFromAcceptLanguage(header: string | null): Locale {
  if (!header) return DEFAULT_LOCALE;
  const parts = header
    .split(",")
    .map((p) => p.trim().split(";")[0].toLowerCase());
  for (const p of parts) {
    const base = p.split("-")[0];
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}
