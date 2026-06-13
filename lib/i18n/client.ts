"use client";

import { LOCALE_COOKIE, isLocale, type Locale } from "./locales";
import { en, type Messages } from "./dictionaries/en";
import { tw } from "./dictionaries/tw";

const DICTIONARIES: Record<Locale, Messages> = { en, tw };

/** Read the active locale from document.cookie (client components only). */
export function getClientLocale(): Locale {
  if (typeof document === "undefined") return "en";
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${LOCALE_COOKIE}=`));
  const value = match?.split("=")[1];
  return isLocale(value) ? value : "en";
}

export function getClientDict(): Messages {
  return DICTIONARIES[getClientLocale()] ?? en;
}
