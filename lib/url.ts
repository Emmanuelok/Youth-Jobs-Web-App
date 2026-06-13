/**
 * Canonical public base URL for the app, with no trailing slash.
 *
 * Resolution order:
 *   1. NEXT_PUBLIC_APP_URL (explicit, preferred — stable across deploys)
 *   2. VERCEL_PROJECT_PRODUCTION_URL (auto-set by Vercel in production)
 *   3. a safe placeholder for local/dev
 *
 * Centralised so SMS links, sitemaps, robots, and consent links all agree.
 */
export function appUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "");
  if (!raw) return "https://ghanayouthjobs.app";
  return raw.replace(/\/+$/, "");
}
