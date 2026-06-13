"use server";

import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { savedOpportunities } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { str } from "@/lib/forms";

/**
 * Toggle a saved opportunity. Save if absent, remove if present. Candidate
 * (and admin) only. Redirects back to wherever the form was submitted from
 * via the `returnTo` field so the button works on both the job list and the
 * job detail page.
 */
export async function toggleSaveJobAction(formData: FormData) {
  const session = await getSession();
  if (!session.userId) redirect("/sign-in?intent=candidate");

  const jobId = str(formData, "jobId");
  const returnTo = str(formData, "returnTo") || "/jobs";
  if (!jobId) redirect(returnTo);

  const db = getDb();
  const [existing] = await db
    .select({ id: savedOpportunities.id })
    .from(savedOpportunities)
    .where(
      and(
        eq(savedOpportunities.candidateId, session.userId!),
        eq(savedOpportunities.jobId, jobId),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .delete(savedOpportunities)
      .where(eq(savedOpportunities.id, existing.id));
  } else {
    await db
      .insert(savedOpportunities)
      .values({ candidateId: session.userId!, jobId })
      .onConflictDoNothing({
        target: [savedOpportunities.candidateId, savedOpportunities.jobId],
      });
  }

  redirect(returnTo);
}
