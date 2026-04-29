"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { employerProfiles, jobs } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { jobPostSchema } from "@/lib/validation";
import { HAZARDOUS_CATEGORIES_DEFAULT } from "@/lib/ghana";
import { bool, num, str, withError } from "@/lib/forms";

export async function createJobAction(formData: FormData) {
  const session = await getSession();
  if (!session.userId) redirect("/sign-in?intent=employer");
  if (session.role !== "employer" && session.role !== "admin") {
    redirect(withError("/", "Only employers can post jobs."));
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

  await db.insert(jobs).values({
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
  });

  redirect("/employer");
}
