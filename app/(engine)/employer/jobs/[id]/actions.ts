"use server";

import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { applications, jobs } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { str, withError } from "@/lib/forms";

export async function setApplicationStatusAction(formData: FormData) {
  const session = await getSession();
  if (!session.userId) redirect("/sign-in?intent=employer");
  if (session.role === "candidate") {
    redirect(withError("/", "Only employers can update applications."));
  }

  const applicationId = str(formData, "applicationId");
  const jobId = str(formData, "jobId");
  const status = str(formData, "status");

  if (!applicationId || !jobId) redirect("/employer");
  const allowed = ["shortlisted", "rejected", "hired"];
  if (!allowed.includes(status)) {
    redirect(withError(`/employer/jobs/${jobId}`, "Invalid status."));
  }

  const db = getDb();

  // Verify the employer owns this job (or admin).
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (!job) redirect("/employer");
  if (session.role !== "admin" && job.employerId !== session.userId) {
    redirect(withError("/employer", "You don't own this job post."));
  }

  await db
    .update(applications)
    .set({ status, updatedAt: new Date() })
    .where(
      and(
        eq(applications.id, applicationId),
        eq(applications.jobId, jobId),
      ),
    );

  redirect(`/employer/jobs/${jobId}`);
}
