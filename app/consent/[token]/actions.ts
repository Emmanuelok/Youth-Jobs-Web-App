"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { auditLogs, guardianConsents } from "@/db/schema";
import { str } from "@/lib/forms";

export async function decideConsentAction(formData: FormData) {
  const token = str(formData, "token");
  const decision = str(formData, "decision"); // 'approved' | 'refused'
  const refusalReason = str(formData, "refusalReason").slice(0, 400) || null;
  if (!token || !["approved", "refused"].includes(decision)) {
    redirect("/");
  }

  const db = getDb();
  const [row] = await db
    .select()
    .from(guardianConsents)
    .where(eq(guardianConsents.token, token))
    .limit(1);
  if (!row) redirect(`/consent/${token}?error=not_found`);
  if (row.revokedAt) redirect(`/consent/${token}?error=revoked`);
  if (row.decisionAt) redirect(`/consent/${token}?error=already_decided`);
  if (row.expiresAt.getTime() < Date.now()) {
    redirect(`/consent/${token}?error=expired`);
  }

  const ip =
    (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  await db
    .update(guardianConsents)
    .set({
      decision,
      decisionAt: new Date(),
      decisionIp: ip,
      refusalReason: decision === "refused" ? refusalReason : null,
    })
    .where(eq(guardianConsents.id, row.id));

  await db.insert(auditLogs).values({
    actorId: null,
    action: `guardian.${decision}`,
    entityType: "guardian_consent",
    entityId: row.id,
    metadata: {
      candidateId: row.candidateId,
      relation: row.guardianRelation,
      ip,
    },
  });

  redirect(`/consent/${token}?done=1`);
}
