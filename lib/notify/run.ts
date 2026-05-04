import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  candidateProfiles,
  jobs,
  notificationLog,
  users,
} from "@/db/schema";
import { sendSms } from "@/lib/auth/sms";
import { sendWhatsApp } from "./whatsapp";
import { scoreJobsForCandidate, type MatchableJob } from "./match";
import { buildSmsDigest } from "./digest";

const MAX_CANDIDATES_PER_RUN = 200;
const RECENT_JOBS_WINDOW_HOURS = 48;

export type AlertRunResult = {
  candidatesConsidered: number;
  digestsSent: number;
  digestsFailed: number;
  candidatesSkippedNoMatch: number;
  durationMs: number;
};

export async function runJobAlerts(): Promise<AlertRunResult> {
  const start = Date.now();
  const db = getDb();
  const now = new Date();

  const recentJobs = await db
    .select({
      id: jobs.id,
      title: jobs.title,
      type: jobs.type,
      category: jobs.category,
      city: jobs.city,
      region: jobs.region,
      description: jobs.description,
      payAmountGhs: jobs.payAmountGhs,
      payPeriod: jobs.payPeriod,
      minimumAge: jobs.minimumAge,
      isHazardous: jobs.isHazardous,
      publishedAt: jobs.publishedAt,
    })
    .from(jobs)
    .where(
      and(
        eq(jobs.status, "published"),
        gt(
          jobs.publishedAt,
          new Date(now.getTime() - RECENT_JOBS_WINDOW_HOURS * 60 * 60 * 1000),
        ),
      ),
    )
    .orderBy(desc(jobs.publishedAt))
    .limit(500);

  if (recentJobs.length === 0) {
    return {
      candidatesConsidered: 0,
      digestsSent: 0,
      digestsFailed: 0,
      candidatesSkippedNoMatch: 0,
      durationMs: Date.now() - start,
    };
  }

  const candidates = await db
    .select({
      userId: users.id,
      phone: users.phone,
      isUnder18: users.isUnder18,
      city: candidateProfiles.city,
      region: candidateProfiles.region,
      skills: candidateProfiles.skills,
      yearOfBirth: candidateProfiles.yearOfBirth,
      lastAlertedAt: candidateProfiles.lastAlertedAt,
      notifyChannel: candidateProfiles.notifyChannel,
    })
    .from(candidateProfiles)
    .innerJoin(users, eq(users.id, candidateProfiles.userId))
    .where(
      and(
        eq(candidateProfiles.alertsEnabled, true),
        isNull(users.bannedAt),
      ),
    )
    // Oldest lastAlertedAt first; nulls (never-alerted) before all of them.
    .orderBy(sql`${candidateProfiles.lastAlertedAt} asc nulls first`)
    .limit(MAX_CANDIDATES_PER_RUN);

  const appUrl = resolveAppUrl();

  let digestsSent = 0;
  let digestsFailed = 0;
  let candidatesSkippedNoMatch = 0;

  for (const c of candidates) {
    if (c.notifyChannel === "none") continue;

    // Only consider jobs published since this candidate was last alerted.
    const cutoff =
      c.lastAlertedAt ??
      new Date(now.getTime() - RECENT_JOBS_WINDOW_HOURS * 60 * 60 * 1000);
    const candidateRecentJobs: MatchableJob[] = recentJobs.filter(
      (j) => j.publishedAt && j.publishedAt > cutoff,
    );
    if (candidateRecentJobs.length === 0) {
      candidatesSkippedNoMatch++;
      await markAlerted(c.userId, now);
      continue;
    }

    const scored = scoreJobsForCandidate(
      {
        city: c.city,
        region: c.region,
        yearOfBirth: c.yearOfBirth,
        isUnder18: c.isUnder18,
        skills: c.skills,
      },
      candidateRecentJobs,
      now,
    );
    if (scored.length === 0) {
      candidatesSkippedNoMatch++;
      await markAlerted(c.userId, now);
      continue;
    }

    const body = buildSmsDigest(scored, appUrl);
    const channel: "sms" | "whatsapp" =
      c.notifyChannel === "whatsapp" ? "whatsapp" : "sms";

    const result =
      channel === "whatsapp"
        ? await sendWhatsApp(c.phone, "job_alert_digest", { body })
        : await sendSms(c.phone, body);

    await db.insert(notificationLog).values({
      candidateId: c.userId,
      channel,
      body,
      jobIds: scored.slice(0, 3).map((s) => s.job.id),
      providerOk: result.ok,
      providerError: result.ok ? null : result.error,
    });

    if (result.ok) digestsSent++;
    else digestsFailed++;

    await markAlerted(c.userId, now);
  }

  return {
    candidatesConsidered: candidates.length,
    digestsSent,
    digestsFailed,
    candidatesSkippedNoMatch,
    durationMs: Date.now() - start,
  };
}

async function markAlerted(userId: string, at: Date): Promise<void> {
  const db = getDb();
  await db
    .update(candidateProfiles)
    .set({ lastAlertedAt: at, updatedAt: at })
    .where(eq(candidateProfiles.userId, userId));
}

function resolveAppUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "");
  if (!raw) return "https://ghanayouthjobs.app"; // safe placeholder
  return raw.replace(/\/+$/, "");
}
