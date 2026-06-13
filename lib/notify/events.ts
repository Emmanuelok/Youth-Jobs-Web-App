import { and, eq, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  applications,
  candidateProfiles,
  employerProfiles,
  interviews,
  jobs,
  notificationLog,
  users,
} from "@/db/schema";
import { sendSms } from "@/lib/auth/sms";
import { log } from "@/lib/log";
import { appUrl } from "@/lib/url";

/**
 * Transactional, single-shot notifications. Distinct from the daily digest
 * pipeline in lib/notify/run.ts — these fire on a specific event (application
 * received, status changed, job decision) and are best-effort: failures are
 * logged but do not roll back the user-facing action.
 *
 * Every send writes a notification_log row with the event kind so admins can
 * audit who got what when.
 */

const APP_URL = appUrl();

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
  if (result.ok) {
    log.info("notify.delivered", {
      kind: opts.kind,
      to: opts.recipientUserId,
      jobIds: opts.jobIds,
    });
  } else {
    log.error("notify.failed", {
      kind: opts.kind,
      to: opts.recipientUserId,
      error: result.error,
    });
  }
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

/* ───────── Interview events ───────── */

function formatWhen(d: Date): string {
  // Africa/Accra is GMT+0, no DST — toLocaleString w/o tz is fine for
  // SMS purposes. Returns e.g. "Tue 17 Jun 14:30".
  return d.toLocaleString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export async function notifyInterviewProposed(interviewId: string) {
  const db = getDb();
  const [iv] = await db
    .select()
    .from(interviews)
    .where(eq(interviews.id, interviewId))
    .limit(1);
  if (!iv) return;

  const [job] = await db
    .select({ title: jobs.title })
    .from(jobs)
    .where(eq(jobs.id, iv.jobId))
    .limit(1);
  const [emp] = await db
    .select({ organizationName: employerProfiles.organizationName })
    .from(employerProfiles)
    .where(eq(employerProfiles.userId, iv.employerId))
    .limit(1);
  const [candUser] = await db
    .select({ phone: users.phone })
    .from(users)
    .where(eq(users.id, iv.candidateId))
    .limit(1);
  if (!candUser) return;

  const when = formatWhen(iv.scheduledAt);
  const modeLabel =
    iv.mode === "in_person"
      ? "in-person"
      : iv.mode === "phone"
        ? "phone"
        : "video";

  const body =
    `${trim(emp?.organizationName ?? "An employer", 25)} would like an ` +
    `interview about "${trim(job?.title ?? "the opportunity", 30)}" — ` +
    `${when} (${iv.durationMinutes}min ${modeLabel}). ` +
    `Confirm or decline: ${APP_URL}/applications`;

  await deliver({
    recipientUserId: iv.candidateId,
    recipientPhone: candUser.phone,
    kind: "interview_proposed",
    body,
    jobIds: [iv.jobId],
  });
}

export async function notifyInterviewDecision(
  interviewId: string,
  decision: "confirmed" | "declined" | "cancelled",
) {
  const db = getDb();
  const [iv] = await db
    .select()
    .from(interviews)
    .where(eq(interviews.id, interviewId))
    .limit(1);
  if (!iv) return;

  // Notify the other party. If the candidate confirmed/declined, tell the
  // employer; if the employer cancelled, tell the candidate.
  const recipientId =
    iv.decisionBy === iv.candidateId ? iv.employerId : iv.candidateId;
  const [recipient] = await db
    .select({ phone: users.phone })
    .from(users)
    .where(eq(users.id, recipientId))
    .limit(1);
  if (!recipient) return;

  const [job] = await db
    .select({ title: jobs.title })
    .from(jobs)
    .where(eq(jobs.id, iv.jobId))
    .limit(1);

  const when = formatWhen(iv.scheduledAt);
  const verb =
    decision === "confirmed"
      ? "confirmed"
      : decision === "declined"
        ? "declined"
        : "cancelled";

  const body = `Interview for "${trim(job?.title ?? "the role", 30)}" on ${when} was ${verb}. See: ${APP_URL}/applications`;

  await deliver({
    recipientUserId: recipientId,
    recipientPhone: recipient.phone,
    kind: `interview_${decision}`,
    body,
    jobIds: [iv.jobId],
  });
}

/**
 * Send the reminder SMS to BOTH sides of an interview. Caller (the cron)
 * is responsible for picking the right window and stamping the appropriate
 * reminder_*_sent_at field so we don't send twice.
 */
export async function notifyInterviewReminder(
  interviewId: string,
  window: "24h" | "1h",
) {
  const db = getDb();
  const [iv] = await db
    .select()
    .from(interviews)
    .where(eq(interviews.id, interviewId))
    .limit(1);
  if (!iv) return;

  const [job] = await db
    .select({ title: jobs.title })
    .from(jobs)
    .where(eq(jobs.id, iv.jobId))
    .limit(1);
  const [emp] = await db
    .select({ phone: users.phone })
    .from(users)
    .where(eq(users.id, iv.employerId))
    .limit(1);
  const [cand] = await db
    .select({ phone: users.phone })
    .from(users)
    .where(eq(users.id, iv.candidateId))
    .limit(1);

  const when = formatWhen(iv.scheduledAt);
  const where =
    iv.mode === "in_person"
      ? iv.locationOrLink ?? "(location TBD)"
      : iv.mode === "phone"
        ? "phone call"
        : iv.locationOrLink ?? "video call";

  const head =
    window === "24h" ? "Tomorrow's interview" : "Interview in 1 hour";
  const body = `${head}: ${trim(job?.title ?? "interview", 30)} at ${when} (${where}). Reply via ${APP_URL}/applications`;

  if (cand) {
    await deliver({
      recipientUserId: iv.candidateId,
      recipientPhone: cand.phone,
      kind: `interview_reminder_${window}`,
      body,
      jobIds: [iv.jobId],
    });
  }
  if (emp) {
    await deliver({
      recipientUserId: iv.employerId,
      recipientPhone: emp.phone,
      kind: `interview_reminder_${window}`,
      body,
      jobIds: [iv.jobId],
    });
  }
}

/**
 * Fan-out: tell every non-terminal applicant when an employer closes a job.
 * Applicants in 'hired', 'rejected', or 'withdrawn' don't need to know.
 */
export async function notifyApplicantsOfClosedJob(jobId: string) {
  const db = getDb();
  const [job] = await db
    .select({ title: jobs.title })
    .from(jobs)
    .where(eq(jobs.id, jobId))
    .limit(1);
  if (!job) return;

  const recipients = await db
    .select({
      candidateId: applications.candidateId,
      phone: users.phone,
    })
    .from(applications)
    .innerJoin(users, eq(users.id, applications.candidateId))
    .where(
      and(
        eq(applications.jobId, jobId),
        or(
          eq(applications.status, "submitted"),
          eq(applications.status, "shortlisted"),
        )!,
      ),
    );

  for (const r of recipients) {
    const body = `The opportunity "${trim(job.title, 40)}" you applied to is no longer accepting applicants. Browse other opportunities: ${APP_URL}/jobs`;
    await deliver({
      recipientUserId: r.candidateId,
      recipientPhone: r.phone,
      kind: "job_closed",
      body,
      jobIds: [jobId],
    });
  }
}
