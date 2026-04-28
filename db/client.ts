import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let cached: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Lazy DB handle. Throws only on first query if DATABASE_URL is missing,
 * so the static landing page can build/deploy without a database.
 */
export function getDb() {
  if (cached) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add it in Vercel → Project → Settings → Environment Variables, or set it locally in .env.local.",
    );
  }
  const sql = neon(url);
  cached = drizzle(sql, { schema });
  return cached;
}

export type Db = ReturnType<typeof getDb>;
export { schema };
