import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";

/**
 * Liveness + readiness check. Verifies the service can reach the database.
 *
 * Returns 200 with { ok: true, db: "ok" } when healthy.
 * Returns 503 with { ok: false, db: "error" } when the DB ping fails.
 *
 * Cached for 0 seconds — uptime monitors should always hit live state.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const start = Date.now();
  let db: "ok" | "error" | "unconfigured" = "ok";
  let dbError: string | undefined;

  if (!process.env.DATABASE_URL) {
    db = "unconfigured";
  } else {
    try {
      const handle = getDb();
      await handle.execute(sql`select 1`);
    } catch (err) {
      db = "error";
      dbError = err instanceof Error ? err.message : String(err);
    }
  }

  const ok = db === "ok";
  const body = {
    ok,
    db,
    dbError,
    durationMs: Date.now() - start,
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    region: process.env.VERCEL_REGION ?? null,
  };
  return NextResponse.json(body, {
    status: ok ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
