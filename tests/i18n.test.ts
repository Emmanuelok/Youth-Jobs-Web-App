import { describe, it, expect } from "vitest";
import { en } from "@/lib/i18n/dictionaries/en";
import { tw } from "@/lib/i18n/dictionaries/tw";
import {
  isLocale,
  localeFromAcceptLanguage,
  LOCALES,
} from "@/lib/i18n/locales";

type Json = Record<string, unknown>;

function flatKeys(obj: Json, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return v && typeof v === "object"
      ? flatKeys(v as Json, key)
      : [key];
  });
}

function allValues(obj: Json): string[] {
  return Object.values(obj).flatMap((v) =>
    v && typeof v === "object" ? allValues(v as Json) : [String(v)],
  );
}

describe("i18n dictionaries", () => {
  it("Twi has exactly the same key set as English (no missing/extra keys)", () => {
    const enKeys = flatKeys(en).sort();
    const twKeys = flatKeys(tw).sort();
    expect(twKeys).toEqual(enKeys);
  });

  it("no dictionary has empty-string values", () => {
    for (const [name, dict] of [
      ["en", en],
      ["tw", tw],
    ] as const) {
      for (const v of allValues(dict)) {
        expect(v.trim().length, `empty value in ${name}`).toBeGreaterThan(0);
      }
    }
  });

  it("the Twi safety strings differ from English (actually translated)", () => {
    // Guards against a copy-paste that leaves safety warnings in English.
    expect(tw.safety.neverPay).not.toBe(en.safety.neverPay);
    expect(tw.safety.messageWarning).not.toBe(en.safety.messageWarning);
  });
});

describe("locale resolution", () => {
  it("isLocale guards known + unknown values", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("tw")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });

  it("localeFromAcceptLanguage picks a shipped locale", () => {
    expect(localeFromAcceptLanguage("tw,en;q=0.9")).toBe("tw");
    expect(localeFromAcceptLanguage("en-GB,en;q=0.9")).toBe("en");
  });

  it("falls back to English for unsupported languages", () => {
    expect(localeFromAcceptLanguage("fr-FR,fr;q=0.9")).toBe("en");
    expect(localeFromAcceptLanguage(null)).toBe("en");
  });

  it("LOCALES contains at least English and Twi", () => {
    expect(LOCALES).toContain("en");
    expect(LOCALES).toContain("tw");
  });
});
