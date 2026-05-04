import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  applications,
  candidateProfiles,
  employerProfiles,
  jobs,
  notificationLog,
  users,
} from "@/db/schema";
import { sendSms } from "@/lib/auth/sms";

/**
 * Transactional, single-shot notifications. Distinct from the daily digest
 * pipeline in lib/notify/run.ts — these fire on a specific event (application
 * received, status changed, job decision) and are best-effort: failures are
 * logged but do not roll back the user-facing action.
 *
 * Every send writes a notification_log row with the event kind so admins can
 * audit who got what when.
 */

const APP_URL = (() => {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "");
  return raw ? raw.replace(/\/+$/, "") : "https://ghanayouthjobs.app";
})();

async function deliver(opts: {
  recipientUserId: string;
  recipientPhone: string;
  kind: string;
  body: string;
  jobIds?: string[];
}) {
  const db = getDb();
  const result = await sendSms(opts.recipientPhone, opts.body);
  await db.insert(notificationLog).values({
    candidateId: opts.recipientUserId,
    channel: "sms",
    kind: opts.kind,
    body: opts.body,
    jobIds: opts.jobIds ?? [],
    providerOk: result.ok,
    providerError: result.ok ? null : result.error,
  });
}

function trim(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n - 1).trimEnd()}…`;
}

/* ───────── Application events ───────── */

export async function notifyApplicationReceived(applicationId: string) {
  const db = getDb();
  const [row] = await db
    .select({
      jobId: jobs.id,
      jobTitle: jobs.title,
      employerId: jobs.employerId,
      candidateName: candidateProfiles.fullName,
    })
    .from(applications)
    .innerJoin(jobs, eq(jobs.id, applications.jobId))
    .innerJoin(
      candidateProfiles,
      eq(candidateProfiles.userId, applications.candidateId),
    )
    .where(eq(applications.id, applicationId))
    .limit(1);
  if (!row) return;

  const [emp] = await db
    .select({ phone: users.phone })
    .from(users)
    .where(eq(users.id, row.employerId))
    .limit(1);
  if (!emp) return;

  const body = `New application: ${trim(row.candidateName, 30)} applied to "${trim(row.jobTitle, 40)}". Review: ${APP_URL}/employer/jobs/${row.jobId}`;
  await deliver({
    recipientUserId: row.employerId,
    recipientPhone: emp.phone,
    kind: "application_received",
    body,
    jobIds: [row.jobId],
  });
}

export async function notifyApplicationWithdrawn(applicationId: string) {
  const db = getDb();
  const [row] = await db
    .select({
      jobId: jobs.id,
      jobTitle: jobs.title,
      employerId: jobs.employerId,
      candidateName: candidateProfiles.fullName,
    })
    .from(applications)
    .innerJoin(jobs, eq(jobs.id, applications.jobId))
    .innerJoin(
      candidateProfiles,
      eq(candidateProfiles.userId, applications.candidateId),
    )
    .where(eq(applications.id, applicationId))
    .limit(1);
  if (!row) return;

  const [emp] = await db
    .select({ phone: users.phone })
    .from(users)
    .where(eq(users.id, row.employerId))
    .limit(1);
  if (!emp) return;

  const body = `${trim(row.candidateName, 30)} withdrew their application to "${trim(row.jobTitle, 40)}".`;
  await deliver({
    recipientUserId: row.employerId,
    recipientPhone: emp.phone,
    kind: "application_withdrawn",
    body,
    jobIds: [row.jobId],
  });
}

export async function notifyApplicationStatusChanged(
  applicationId: string,
  newStatus: "shortlisted" | "rejected" | "hired",
) {
  const db = getDb();
  const [row] = await db
    .select({
      candidateId: applications.candidateId,
      jobId: jobs.id,
      jobTitle: jobs.title,
      organizationName: employerProfiles.organizationName,
    })
    .from(applications)
    .innerJoin(jobs, eq(jobs.id, applications.jobId))
    .leftJoin(
      employerProfiles,
      eq(employerProfiles.userId, jobs.employerId),
    )
    .where(eq(applications.id, applicationId))
    .limit(1);
  if (!row) return;

  const [cand] = await db
    .select({ phone: users.phone })
    .from(users)
    .where(eq(users.id, row.candidateId))
    .limit(1);
  if (!cand) return;

  const friendly =
    newStatus === "shortlisted"
      ? "shortlisted"
      : newStatus === "hired"
        ? "hired — congratulations!"
        : "not selected";

  const body = `Update on your application to "${trim(row.jobTitle, 35)}" at ${trim(row.organizationName ?? "an employer", 25)}: ${friendly}. Open: ${APP_URL}/applications`;
  await deliver({
    recipientUserId: row.candidateId,
    recipientPhone: cand.phone,
    kind: "application_status",
    body,
    jobIds: [row.jobId],
  });
}

/* ───────── Job moderation events ───────── */

export async function notifyJobDecision(
  jobId: string,
  decision: "published" | "rejected",
  reason?: string | null,
) {
  const db = getDb();
  const [row] = await db
    .select({
      employerId: jobs.employerId,
      title: jobs.title,
    })
    .from(jobs)
    .where(eq(jobs.id, jobId))
    .limit(1);
  if (!row) return;

  const [emp] = await db
    .select({ phone: users.phone })
    .from(users)
    .where(eq(users.id, row.employerId))
    .limit(1);
  if (!emp) return;

  const body =
    decision === "published"
      ? `Your post "${trim(row.title, 40)}" is live. View applicants: ${APP_URL}/employer/jobs/${jobId}`
      : `Your post "${trim(row.title, 40)}" was not approved${reason ? `: ${trim(reason, 100)}` : ""}. You can revise and submit a new one.`;

  await deliver({
    recipientUserId: row.employerId,
    recipientPhone: emp.phone,
    kind: "job_decision",
    body,
    jobIds: [jobId],
  });
}
