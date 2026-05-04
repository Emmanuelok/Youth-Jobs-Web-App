"use server";

import { redirect } from "next/navigation";
import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  auditLogs,
  guardianConsents,
  users,
} from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { phoneSchema } from "@/lib/validation";
import { str, withError, withFlash } from "@/lib/forms";

export async function revokeMyConsentAction(formData: FormData) {
  const session = await getSession();
  if (!session.userId) redirect("/sign-in");

  const reason = str(formData, "reason").slice(0, 400) || null;
  const db = getDb();

  // Revoke the most recent non-revoked consent.
  const [latest] = await db
    .select({ id: guardianConsents.id })
    .from(guardianConsents)
    .where(
      and(
        eq(guardianConsents.candidateId, session.userId!),
        isNull(guardianConsents.revokedAt),
      ),
    )
    .orderBy(desc(guardianConsents.requestedAt))
    .limit(1);

  if (!latest) {
    redirect(withFlash("/settings", "No active consent to revoke."));
  }

  const now = new Date();
  await db
    .update(guardianConsents)
    .set({ revokedAt: now, refusalReason: reason })
    .where(eq(guardianConsents.id, latest.id));

  await db.insert(auditLogs).values({
    actorId: session.userId!,
    action: "guardian.revoke_self",
    entityType: "guardian_consent",
    entityId: latest.id,
    metadata: { reason },
  });

  redirect(withFlash("/settings", "Guardian approval revoked."));
}

export async function deleteMyAccountAction(formData: FormData) {
  const session = await getSession();
  if (!session.userId) redirect("/sign-in");

  const confirmPhoneInput = str(formData, "confirmPhone");
  const reason = str(formData, "reason").slice(0, 400) || null;

  const phoneParsed = phoneSchema.safeParse(confirmPhoneInput);
  if (!phoneParsed.success) {
    redirect(
      withError(
        "/settings",
        "Type your full phone number to confirm. We don't want to delete the wrong account.",
      ),
    );
  }

  const db = getDb();
  const [u] = await db
    .select({ id: users.id, phone: users.phone, role: users.primaryRole })
    .from(users)
    .where(eq(users.id, session.userId!))
    .limit(1);

  if (!u || u.phone !== phoneParsed.data) {
    redirect(
      withError(
        "/settings",
        "The phone number you typed doesn't match this account.",
      ),
    );
  }

  // Audit BEFORE the delete — actor_id is loose uuid so it survives the cascade.
  await db.insert(auditLogs).values({
    actorId: u.id,
    action: "user.delete_self",
    entityType: "user",
    entityId: u.id,
    metadata: { role: u.role, reason },
  });

  // Cascade drops profile, applications, jobs (if employer), conversations,
  // messages, generated CVs, scam reports as reporter, OTP codes, and
  // notification log rows. audit_logs is FK-free and survives.
  await db.delete(users).where(eq(users.id, u.id));

  // End the session.
  const s = await getSession();
  s.destroy();

  redirect("/?deleted=1");
}
