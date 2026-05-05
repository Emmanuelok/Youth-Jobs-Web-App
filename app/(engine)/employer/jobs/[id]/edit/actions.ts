"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  apprenticeshipTerms,
  auditLogs,
  jobs,
} from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import {
  apprenticeshipTermsSchema,
  jobPostSchema,
} from "@/lib/validation";
import { HAZARDOUS_CATEGORIES_DEFAULT } from "@/lib/ghana";
import { bool, num, str, strs, withError } from "@/lib/forms";

/**
 * Edit an existing job post.
 *
 * Behaviour:
 *   - Closed posts cannot be edited (use create-new instead).
 *   - Editing a published post drops it back to pending_review so an admin
 *     can re-verify the new content. Posts in draft / pending_review /
 *     rejected stay in their existing status (rejected becomes pending_review
 *     since editing implicitly addresses the rejection).
 *   - Apprenticeship terms can be updated alongside the parent job.
 *   - Audit log row is written so admins can see what changed and when.
 */
export async function updateJobAction(formData: FormData) {
  const session = await getSession();
  if (!session.userId) redirect("/sign-in?intent=employer");
  if (session.role === "candidate") {
    redirect(withError("/", "Only employers can edit jobs."));
  }

  const jobId = str(formData, "jobId");
  if (!jobId) redirect("/employer");

  const db = getDb();
  const [existing] = await db
    .select()
    .from(jobs)
    .where(eq(jobs.id, jobId))
    .limit(1);
  if (!existing) redirect("/employer");
  if (session.role !== "admin" && existing.employerId !== session.userId) {
    redirect(withError("/employer", "You don't own this job post."));
  }
  if (existing.status === "closed") {
    redirect(
      withError(
        "/employer",
        "This post is closed. Create a new one instead.",
      ),
    );
  }

  const category = str(formData, "category");
  const isHazardousFromForm = bool(formData, "isHazardous");
  const isHazardous =
    isHazardousFromForm || HAZARDOUS_CATEGORIES_DEFAULT.has(category);
  const minimumAgeRaw = num(formData, "minimumAge") ?? 18;
  const minimumAge = isHazardous ? Math.max(18, minimumAgeRaw) : minimumAgeRaw;

  const parsed = jobPostSchema.safeParse({
    type: str(formData, "type"),
    title: str(formData, "title"),
    description: str(formData, "description"),
    category,
    city: str(formData, "city"),
    region: str(formData, "region"),
    payAmountGhs: num(formData, "payAmountGhs"),
    payPeriod: str(formData, "payPeriod"),
    minimumAge,
    isHazardous,
  });

  if (!parsed.success) {
    redirect(
      withError(
        `/employer/jobs/${jobId}/edit`,
        parsed.error.issues[0]?.message ?? "Please check the form.",
      ),
    );
  }

  const data = parsed.data;

  let termsData: ReturnType<typeof apprenticeshipTermsSchema.parse> | null =
    null;
  if (data.type === "apprenticeship") {
    const trainingTopicsRaw = str(formData, "trainingTopics");
    const trainingTopics = trainingTopicsRaw
      ? trainingTopicsRaw
          .split(/[,\n]/)
          .map((t) => t.trim())
          .filter(Boolean)
      : strs(formData, "trainingTopics");
    const stipendPeriodRaw = str(formData, "stipendPeriod");

    const termsParsed = apprenticeshipTermsSchema.safeParse({
      durationMonths: num(formData, "durationMonths") ?? 0,
      hoursPerWeek: num(formData, "hoursPerWeek") ?? 0,
      stipendAmountGhs: num(formData, "stipendAmountGhs"),
      stipendPeriod:
        stipendPeriodRaw === "week" || stipendPeriodRaw === "month"
          ? stipendPeriodRaw
          : null,
      startTimeOfDay: str(formData, "startTimeOfDay"),
      endTimeOfDay: str(formData, "endTimeOfDay"),
      daysOffPerWeek: num(formData, "daysOffPerWeek") ?? 0,
      trainingTopics,
      completionOutcome: str(formData, "completionOutcome"),
      notesForGuardians: str(formData, "notesForGuardians") || undefined,
    });
    if (!termsParsed.success) {
      redirect(
        withError(
          `/employer/jobs/${jobId}/edit`,
          `Apprenticeship terms: ${termsParsed.error.issues[0]?.message ?? "incomplete"}`,
        ),
      );
    }
    termsData = termsParsed.data;
  }

  const newStatus =
    existing.status === "published" || existing.status === "rejected"
      ? "pending_review"
      : existing.status;

  await db
    .update(jobs)
    .set({
      type: data.type,
      title: data.title,
      description: data.description,
      category: data.category,
      city: data.city,
      region: data.region,
      payAmountGhs: data.payAmountGhs ?? null,
      payPeriod: data.payPeriod,
      minimumAge: data.minimumAge,
      isHazardous: data.isHazardous,
      status: newStatus,
      // Clear publishedAt and rejectedReason on edit so the next admin
      // decision starts fresh.
      publishedAt:
        newStatus === "published" ? existing.publishedAt : null,
      rejectedReason: null,
      updatedAt: new Date(),
    })
    .where(eq(jobs.id, jobId));

  if (termsData) {
    await db
      .insert(apprenticeshipTerms)
      .values({
        jobId,
        durationMonths: termsData.durationMonths,
        hoursPerWeek: termsData.hoursPerWeek,
        stipendAmountGhs: termsData.stipendAmountGhs,
        stipendPeriod: termsData.stipendPeriod,
        startTimeOfDay: termsData.startTimeOfDay,
        endTimeOfDay: termsData.endTimeOfDay,
        daysOffPerWeek: termsData.daysOffPerWeek,
        trainingTopics: termsData.trainingTopics,
        completionOutcome: termsData.completionOutcome,
        notesForGuardians: termsData.notesForGuardians,
      })
      .onConflictDoUpdate({
        target: apprenticeshipTerms.jobId,
        set: {
          durationMonths: termsData.durationMonths,
          hoursPerWeek: termsData.hoursPerWeek,
          stipendAmountGhs: termsData.stipendAmountGhs,
          stipendPeriod: termsData.stipendPeriod,
          startTimeOfDay: termsData.startTimeOfDay,
          endTimeOfDay: termsData.endTimeOfDay,
          daysOffPerWeek: termsData.daysOffPerWeek,
          trainingTopics: termsData.trainingTopics,
          completionOutcome: termsData.completionOutcome,
          notesForGuardians: termsData.notesForGuardians,
          updatedAt: new Date(),
        },
      });
  }

  await db.insert(auditLogs).values({
    actorId: session.userId!,
    action: "job.edit",
    entityType: "job",
    entityId: jobId,
    metadata: {
      previousStatus: existing.status,
      newStatus,
      title: data.title,
    },
  });

  redirect(`/employer/jobs/${jobId}`);
}
