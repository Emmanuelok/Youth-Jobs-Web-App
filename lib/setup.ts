/**
 * Returns a list of human-readable env-var problems. Empty array means the
 * engine is fully configured. Used by the `(engine)` route group layout to
 * render a friendly setup screen instead of crashing.
 */
export function getSetupErrors(): string[] {
  const errors: string[] = [];
  if (!process.env.DATABASE_URL) {
    errors.push(
      "DATABASE_URL is not set. Provision Vercel Postgres / Neon and add the URL in Project → Settings → Environment Variables.",
    );
  }
  const secret = process.env.SESSION_SECRET ?? "";
  if (secret.length < 32) {
    errors.push(
      "SESSION_SECRET is missing or shorter than 32 characters. Generate one with: openssl rand -base64 48",
    );
  }
  return errors;
}

export function isAdminPhone(phone: string): boolean {
  const list = (process.env.ADMIN_PHONES ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return list.includes(phone);
}
