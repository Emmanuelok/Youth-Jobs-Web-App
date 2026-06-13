"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n/locales";

/**
 * Set the UI locale cookie and return the user to where they were.
 * Progressive-enhancement friendly: works as a plain form POST, no client JS
 * required — important for low-end devices and data-saver browsers.
 */
export async function setLocaleAction(formData: FormData) {
  const value = formData.get("locale");
  const locale = typeof value === "string" && isLocale(value) ? value : "en";

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    httpOnly: false, // readable by the lang attribute hydration; not sensitive
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  // Bounce back to the originating page where possible.
  const referer = (await headers()).get("referer");
  let dest = "/";
  if (referer) {
    try {
      dest = new URL(referer).pathname || "/";
    } catch {
      dest = "/";
    }
  }
  redirect(dest);
}
