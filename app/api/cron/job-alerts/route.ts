import { NextResponse } from "next/server";
import { log } from "@/lib/log";
import { runJobAlerts } from "@/lib/notify/run";

/**
 * Daily job-alert cron. Vercel hits this endpoint on the schedule defined in
 * vercel.json with `Authorization: Bearer ${CRON_SECRET}` set automatically
 * (provided CRON_SECRET is in env vars).
 *
 * Manual invocation for testing:
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/cron/job-alerts
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60; // seconds — enough for ~200 candidates with stubbed SMS

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    log.error("cron.misconfigured", { reason: "CRON_SECRET not set" });
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET is not configured" },
      { status: 500 },
    );
  }

  const provided = request.headers.get("authorization");
  if (provided !== `Bearer ${expected}`) {
    log.warn("cron.unauthorized", { hasHeader: !!provided });
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const result = await runJobAlerts();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    log.error("cron.run_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
