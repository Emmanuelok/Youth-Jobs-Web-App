"use server";

import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { applications, auditLogs } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { notifyApplicationWithdrawn } from "@/lib/notify/events";
import { str, withFlash } from "@/lib/forms";

export async function withdrawApplicationAction(formData: FormData) {
  const session = await getSession();
  if (!session.userId) redirect("/sign-in?intent=candidate");

  const applicationId = str(formData, "applicationId");
  if (!applicationId) redirect("/applications");

  const db = getDb();

  // Verify ownership before update.
  const [app] = await db
    .select({ id: applications.id, status: applications.status })
    .from(applications)
    .where(
      and(
        eq(applications.id, applicationId),
        eq(applications.candidateId, session.userId!),
      ),
    )
    .limit(1);
  if (!app) redirect("/applications");

  // Already in a terminal state? Don't bother.
  if (app.status === "withdrawn" || app.status === "hired") {
    redirect(withFlash("/applications", "Already updated."));
  }

  await db
    .update(applications)
    .set({ status: "withdrawn", updatedAt: new Date() })
    .where(eq(applications.id, app.id));

  await db.insert(auditLogs).values({
    actorId: session.userId!,
    action: "application.withdraw",
    entityType: "application",
    entityId: app.id,
  });

  await notifyApplicationWithdrawn(app.id).catch((err) => {
    console.error("notifyApplicationWithdrawn failed:", err);
  });

  redirect(withFlash("/applications", "Application withdrawn."));
}
