"use server";

import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { applications, auditLogs, interviews, jobs } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { claimIdempotencyKey } from "@/lib/idempotency";
import { log } from "@/lib/log";
import {
  notifyInterviewDecision,
  notifyInterviewProposed,
} from "@/lib/notify/events";
import { checkLimit } from "@/lib/ratelimit";
import { interviewProposalSchema } from "@/lib/validation";
import { num, str, withError, withFlash } from "@/lib/forms";

/**
 * Employer proposes an interview to a specific applicant.
 *
 * The proposer is the employer (or admin acting on their behalf), the
 * application must exist for the job, and the proposed time has to be in
 * the future and within 90 days.
 */
export async function proposeInterviewAction(formData: FormData) {
  const session = await getSession();
  if (!session.userId) redirect("/sign-in?intent=employer");
  if (session.role === "candidate") {
    redirect(withError("/", "Only employers can propose interviews."));
  }

  const jobId = str(formData, "jobId");
  const candidateId = str(formData, "candidateId");
  if (!jobId || !candidateId) redirect("/employer");

  const rl = await checkLimit("conversation_start", session.userId);
  if (!rl.ok) {
    redirect(
      withError(
        `/employer/jobs/${jobId}`,
        `Try again in about ${Math.ceil(rl.resetSeconds / 60)} minutes.`,
      ),
    );
  }
  const firstClaim = await claimIdempotencyKey(str(formData, "idemKey"));
  if (!firstClaim) redirect(`/employer/jobs/${jobId}`);

  const parsed = interviewProposalSchema.safeParse({
    applicationId: str(formData, "applicationId") || null,
    scheduledAt: str(formData, "scheduledAt"),
    durationMinutes: num(formData, "durationMinutes") ?? 30,
    mode: str(formData, "mode"),
    locationOrLink: str(formData, "locationOrLink") || undefined,
    notes: str(formData, "notes") || undefined,
  });
  if (!parsed.success) {
    redirect(
      withError(
        `/employer/jobs/${jobId}`,
        parsed.error.issues[0]?.message ?? "Invalid interview proposal.",
      ),
    );
  }

  const db = getDb();
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (!job) redirect("/employer");
  if (session.role !== "admin" && job.employerId !== session.userId) {
    redirect(withError("/employer", "You don't own this job post."));
  }

  const [app] = await db
    .select({ id: applications.id })
    .from(applications)
    .where(
      and(
        eq(applications.jobId, jobId),
        eq(applications.candidateId, candidateId),
      ),
    )
    .limit(1);
  if (!app) {
    redirect(
      withError(
        `/employer/jobs/${jobId}`,
        "That candidate has not applied to this job.",
      ),
    );
  }

  const data = parsed.data;
  const [created] = await db
    .insert(interviews)
    .values({
      jobId,
      employerId: job.employerId,
      candidateId,
      applicationId: app.id,
      proposedBy: session.userId!,
      scheduledAt: new Date(data.scheduledAt),
      durationMinutes: data.durationMinutes,
      mode: data.mode,
      locationOrLink: data.locationOrLink,
      notes: data.notes,
      status: "proposed",
    })
    .returning({ id: interviews.id });

  if (created) {
    await notifyInterviewProposed(created.id).catch((err) => {
      log.error("notify.interview_proposed_failed", {
        interviewId: created.id,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }

  redirect(
    withFlash(`/employer/jobs/${jobId}`, "Interview proposed."),
  );
}

/**
 * Candidate confirms a proposed interview. Only the candidate party can
 * confirm; declines are also candidate-only. Employers can cancel via
 * cancelInterviewAction.
 */
export async function decideInterviewAction(formData: FormData) {
  const session = await getSession();
  if (!session.userId) redirect("/sign-in");

  const interviewId = str(formData, "interviewId");
  const decision = str(formData, "decision"); // 'confirmed' | 'declined'
  if (!interviewId || !["confirmed", "declined"].includes(decision)) {
    redirect("/applications");
  }

  const db = getDb();
  const [iv] = await db
    .select()
    .from(interviews)
    .where(eq(interviews.id, interviewId))
    .limit(1);
  if (!iv) redirect("/applications");
  if (iv.candidateId !== session.userId && session.role !== "admin") {
    redirect("/applications");
  }
  if (iv.status !== "proposed") {
    redirect(withFlash("/applications", "Already decided."));
  }

  const now = new Date();
  await db
    .update(interviews)
    .set({
      status: decision,
      decisionAt: now,
      decisionBy: session.userId!,
      updatedAt: now,
    })
    .where(eq(interviews.id, iv.id));

  await db.insert(auditLogs).values({
    actorId: session.userId!,
    action: `interview.${decision}`,
    entityType: "interview",
    entityId: iv.id,
  });

  await notifyInterviewDecision(iv.id, decision as "confirmed" | "declined").catch(
    (err) => {
      log.error("notify.interview_decision_failed", {
        interviewId: iv.id,
        error: err instanceof Error ? err.message : String(err),
      });
    },
  );

  redirect(withFlash("/applications", `Interview ${decision}.`));
}

/**
 * Either party can cancel. We don't allow cancelling a 'completed' or
 * already-cancelled interview.
 */
export async function cancelInterviewAction(formData: FormData) {
  const session = await getSession();
  if (!session.userId) redirect("/sign-in");

  const interviewId = str(formData, "interviewId");
  if (!interviewId) redirect("/applications");

  const db = getDb();
  const [iv] = await db
    .select()
    .from(interviews)
    .where(eq(interviews.id, interviewId))
    .limit(1);
  if (!iv) redirect("/applications");

  const isParticipant =
    iv.candidateId === session.userId || iv.employerId === session.userId;
  if (!isParticipant && session.role !== "admin") redirect("/applications");
  if (["completed", "cancelled", "no_show"].includes(iv.status)) {
    redirect(withFlash("/applications", "Already finalised."));
  }

  const now = new Date();
  await db
    .update(interviews)
    .set({
      status: "cancelled",
      decisionAt: now,
      decisionBy: session.userId!,
      updatedAt: now,
    })
    .where(eq(interviews.id, iv.id));

  await db.insert(auditLogs).values({
    actorId: session.userId!,
    action: "interview.cancelled",
    entityType: "interview",
    entityId: iv.id,
  });

  await notifyInterviewDecision(iv.id, "cancelled").catch((err) => {
    log.error("notify.interview_cancel_failed", {
      interviewId: iv.id,
      error: err instanceof Error ? err.message : String(err),
    });
  });

  const back =
    iv.employerId === session.userId
      ? `/employer/jobs/${iv.jobId}`
      : "/applications";
  redirect(withFlash(back, "Interview cancelled."));
}

/**
 * Employer marks a completed interview as actually happened (or no_show).
 * Closes the loop for analytics and lets us prompt the next step.
 */
export async function markInterviewOutcomeAction(formData: FormData) {
  const session = await getSession();
  if (!session.userId) redirect("/sign-in");

  const interviewId = str(formData, "interviewId");
  const outcome = str(formData, "outcome"); // 'completed' | 'no_show'
  if (!interviewId || !["completed", "no_show"].includes(outcome)) {
    redirect("/employer");
  }

  const db = getDb();
  const [iv] = await db
    .select()
    .from(interviews)
    .where(eq(interviews.id, interviewId))
    .limit(1);
  if (!iv) redirect("/employer");
  if (session.role !== "admin" && iv.employerId !== session.userId) {
    redirect("/employer");
  }

  await db
    .update(interviews)
    .set({
      status: outcome,
      decisionAt: new Date(),
      decisionBy: session.userId!,
      updatedAt: new Date(),
    })
    .where(eq(interviews.id, iv.id));

  await db.insert(auditLogs).values({
    actorId: session.userId!,
    action: `interview.${outcome}`,
    entityType: "interview",
    entityId: iv.id,
  });

  redirect(`/employer/jobs/${iv.jobId}`);
}
