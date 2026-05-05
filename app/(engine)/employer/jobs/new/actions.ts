"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  apprenticeshipTerms,
  employerProfiles,
  jobs,
} from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import {
  apprenticeshipTermsSchema,
  jobPostSchema,
} from "@/lib/validation";
import { HAZARDOUS_CATEGORIES_DEFAULT } from "@/lib/ghana";
import { claimIdempotencyKey } from "@/lib/idempotency";
import { checkLimit } from "@/lib/ratelimit";
import { bool, num, str, strs, withError } from "@/lib/forms";

export async function createJobAction(formData: FormData) {
  const session = await getSession();
  if (!session.userId) redirect("/sign-in?intent=employer");
  if (session.role !== "employer" && session.role !== "admin") {
    redirect(withError("/", "Only employers can post jobs."));
  }

  const limit = await checkLimit("job_post", session.userId!);
  if (!limit.ok) {
    redirect(
      withError(
        "/employer/jobs/new",
        `Too many posts in the last hour. Try again in about ${Math.ceil(limit.resetSeconds / 60)} minutes.`,
      ),
    );
  }

  const idemKey = str(formData, "idemKey");
  const firstClaim = await claimIdempotencyKey(idemKey);
  if (!firstClaim) {
    redirect("/employer");
  }

  const db = getDb();

  // Employer must be verified before posts go live (jobs default to pending_review either way).
  const [employer] = await db
    .select()
    .from(employerProfiles)
    .where(eq(employerProfiles.userId, session.userId!))
    .limit(1);
  if (!employer) redirect("/onboarding/employer");

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
        "/employer/jobs/new",
        parsed.error.issues[0]?.message ?? "Please check the form.",
      ),
    );
  }

  const data = parsed.data;

  // Apprenticeship-specific terms — required when type=apprenticeship.
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
          "/employer/jobs/new",
          `Apprenticeship terms: ${termsParsed.error.issues[0]?.message ?? "incomplete"}`,
        ),
      );
    }
    termsData = termsParsed.data;
  }

  const [created] = await db
    .insert(jobs)
    .values({
      employerId: session.userId!,
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
      status: "pending_review",
    })
    .returning({ id: jobs.id });

  if (termsData && created) {
    await db.insert(apprenticeshipTerms).values({
      jobId: created.id,
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
    });
  }

  redirect("/employer");
}
