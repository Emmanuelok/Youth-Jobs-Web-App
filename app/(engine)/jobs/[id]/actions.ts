"use server";

import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  applications,
  apprenticeshipTerms,
  candidateProfiles,
  jobs,
  scamReports,
  users,
} from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { hasApprovedConsent } from "@/lib/consent";
import { claimIdempotencyKey } from "@/lib/idempotency";
import { notifyApplicationReceived } from "@/lib/notify/events";
import { checkLimit } from "@/lib/ratelimit";
import { scamReportSchema } from "@/lib/validation";
import { bool, str, withError, withFlash } from "@/lib/forms";

export async function applyToJobAction(formData: FormData) {
  const jobId = str(formData, "jobId");
  if (!jobId) redirect("/jobs");

  const session = await getSession();
  if (!session.userId) {
    redirect(`/sign-in?intent=candidate`);
  }

  const limit = await checkLimit("apply", session.userId);
  if (!limit.ok) {
    redirect(
      withError(
        `/jobs/${jobId}`,
        `You're applying very quickly. Try again in about ${Math.ceil(limit.resetSeconds / 60)} minutes.`,
      ),
    );
  }

  const db = getDb();

  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (!job || job.status !== "published") {
    redirect(withError("/jobs", "That opportunity is no longer available."));
  }

  // Candidate must have a profile.
  const [profile] = await db
    .select()
    .from(candidateProfiles)
    .where(eq(candidateProfiles.userId, session.userId!))
    .limit(1);
  if (!profile) redirect("/onboarding/candidate");

  const [user] = await db
    .select({ isUnder18: users.isUnder18 })
    .from(users)
    .where(eq(users.id, session.userId!))
    .limit(1);

  // Trust gates.
  const candidateAge = new Date().getFullYear() - profile.yearOfBirth;
  if (candidateAge < job.minimumAge) {
    redirect(
      withError(
        `/jobs/${jobId}`,
        `This opportunity requires age ${job.minimumAge} or above.`,
      ),
    );
  }
  if (job.isHazardous && user?.isUnder18) {
    redirect(
      withError(
        `/jobs/${jobId}`,
        "This trade is classed as hazardous and not open to under-18 applicants.",
      ),
    );
  }

  // Under-18 applicants need an approved guardian consent on file.
  if (user?.isUnder18) {
    const ok = await hasApprovedConsent(session.userId!);
    if (!ok) {
      redirect(`/onboarding/guardian?next=${encodeURIComponent(`/jobs/${jobId}`)}`);
    }
  }

  const message = str(formData, "message").slice(0, 600) || null;

  // Apprenticeship-specific gate: require explicit terms acknowledgment.
  let acknowledgedTermsAt: Date | null = null;
  if (job.type === "apprenticeship") {
    const [terms] = await db
      .select({ jobId: apprenticeshipTerms.jobId })
      .from(apprenticeshipTerms)
      .where(eq(apprenticeshipTerms.jobId, jobId))
      .limit(1);
    if (!terms) {
      redirect(
        withError(
          `/jobs/${jobId}`,
          "This apprenticeship is missing terms. Please report it.",
        ),
      );
    }
    if (!bool(formData, "acknowledgedTerms")) {
      redirect(
        withError(
          `/jobs/${jobId}`,
          "Please confirm you have read the apprenticeship terms before applying.",
        ),
      );
    }
    acknowledgedTermsAt = new Date();
  }

  const inserted = await db
    .insert(applications)
    .values({
      jobId,
      candidateId: session.userId!,
      message,
      acknowledgedTermsAt,
    })
    .onConflictDoNothing({
      target: [applications.jobId, applications.candidateId],
    })
    .returning({ id: applications.id });

  // Best-effort notification to the employer; never blocks the user response.
  if (inserted[0]?.id) {
    await notifyApplicationReceived(inserted[0].id).catch((err) => {
      console.error("notifyApplicationReceived failed:", err);
    });
  }

  redirect(withFlash(`/jobs/${jobId}`, "Application sent. Good luck!"));
}

export async function reportJobAction(formData: FormData) {
  const session = await getSession();

  // Use phone-or-IP-equivalent identifier when no session: fall back to
  // the jobId so anonymous spam against one job is bounded.
  const limitId = session.userId ?? `anon:${str(formData, "jobId")}`;
  const limit = await checkLimit("scam_report", limitId);
  if (!limit.ok) {
    redirect(
      withError(
        `/jobs/${str(formData, "jobId")}`,
        "Too many reports for now. Try again later.",
      ),
    );
  }

  const idemKey = str(formData, "idemKey");
  const firstClaim = await claimIdempotencyKey(idemKey);
  if (!firstClaim) {
    redirect(
      withFlash(
        `/jobs/${str(formData, "jobId")}`,
        "Thanks — we already received that report.",
      ),
    );
  }

  const parsed = scamReportSchema.safeParse({
    jobId: str(formData, "jobId"),
    category: str(formData, "category"),
    notes: str(formData, "notes") || undefined,
  });

  if (!parsed.success) {
    redirect(
      withError(
        `/jobs/${str(formData, "jobId")}`,
        "Please choose a reason before reporting.",
      ),
    );
  }

  const db = getDb();
  await db.insert(scamReports).values({
    jobId: parsed.data.jobId,
    reporterId: session.userId ?? null,
    category: parsed.data.category,
    notes: parsed.data.notes,
  });

  // If a job accumulates 3+ open reports, auto-suspend for admin review.
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(scamReports)
    .where(
      and(
        eq(scamReports.jobId, parsed.data.jobId),
        eq(scamReports.status, "open"),
      ),
    );

  if ((row?.count ?? 0) >= 3) {
    await db
      .update(jobs)
      .set({ status: "pending_review", updatedAt: new Date() })
      .where(eq(jobs.id, parsed.data.jobId));
  }

  redirect(
    withFlash(
      `/jobs/${parsed.data.jobId}`,
      "Thanks for flagging this. Our team will review it.",
    ),
  );
}
