import { NextResponse } from "next/server";
import { and, eq, gt, isNull, lte } from "drizzle-orm";
import { getDb } from "@/db/client";
import { interviews } from "@/db/schema";
import { log } from "@/lib/log";
import { notifyInterviewReminder } from "@/lib/notify/events";

/**
 * Interview-reminder cron. Designed to be called hourly. Sends each
 * scheduled interview a 24h-out reminder once and a 1h-out reminder once,
 * stamping the row so a re-run never double-sends.
 *
 * Idempotency comes from the reminder_*_sent_at columns: the WHERE clause
 * only picks up interviews that haven't yet had that reminder.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const HOUR = 60 * 60 * 1000;

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    log.error("cron.misconfigured", {
      route: "interview-reminders",
      reason: "CRON_SECRET not set",
    });
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET is not configured" },
      { status: 500 },
    );
  }
  const provided = request.headers.get("authorization");
  if (provided !== `Bearer ${expected}`) {
    log.warn("cron.unauthorized", { route: "interview-reminders" });
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const start = Date.now();
  const db = getDb();
  const now = new Date();
  let sent24h = 0;
  let sent1h = 0;

  try {
    // 24-hour window: interviews 23-25h out that haven't had their 24h
    // reminder yet. Slightly wider than 1h so an hourly cron catches them.
    const due24 = await db
      .select({ id: interviews.id })
      .from(interviews)
      .where(
        and(
          eq(interviews.status, "confirmed"),
          isNull(interviews.reminder24hSentAt),
          gt(interviews.scheduledAt, new Date(now.getTime() + 23 * HOUR)),
          lte(interviews.scheduledAt, new Date(now.getTime() + 25 * HOUR)),
        ),
      );
    for (const iv of due24) {
      await notifyInterviewReminder(iv.id, "24h").catch((err) => {
        log.error("cron.reminder_failed", {
          interviewId: iv.id,
          window: "24h",
          error: err instanceof Error ? err.message : String(err),
        });
      });
      await db
        .update(interviews)
        .set({ reminder24hSentAt: new Date() })
        .where(eq(interviews.id, iv.id));
      sent24h += 1;
    }

    // 1-hour window: 30-90 minutes out.
    const due1 = await db
      .select({ id: interviews.id })
      .from(interviews)
      .where(
        and(
          eq(interviews.status, "confirmed"),
          isNull(interviews.reminder1hSentAt),
          gt(interviews.scheduledAt, new Date(now.getTime() + 30 * 60 * 1000)),
          lte(interviews.scheduledAt, new Date(now.getTime() + 90 * 60 * 1000)),
        ),
      );
    for (const iv of due1) {
      await notifyInterviewReminder(iv.id, "1h").catch((err) => {
        log.error("cron.reminder_failed", {
          interviewId: iv.id,
          window: "1h",
          error: err instanceof Error ? err.message : String(err),
        });
      });
      await db
        .update(interviews)
        .set({ reminder1hSentAt: new Date() })
        .where(eq(interviews.id, iv.id));
      sent1h += 1;
    }

    const summary = {
      ok: true,
      sent24h,
      sent1h,
      durationMs: Date.now() - start,
    };
    log.info("cron.interview_reminders_completed", summary);
    return NextResponse.json(summary);
  } catch (err) {
    log.error("cron.run_failed", {
      route: "interview-reminders",
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
