"use server";

import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  candidateProfiles,
  guardianConsents,
  users,
} from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { sendSms } from "@/lib/auth/sms";
import { checkLimit } from "@/lib/ratelimit";
import { phoneSchema } from "@/lib/validation";
import { str, withError, withFlash } from "@/lib/forms";

const CONSENT_TTL_DAYS = 14;

export async function requestGuardianConsentAction(formData: FormData) {
  const session = await getSession();
  if (!session.userId) redirect("/sign-in?intent=candidate");

  const limit = await checkLimit("guardian_request", session.userId);
  if (!limit.ok) {
    redirect(
      withError(
        "/onboarding/guardian",
        `Too many requests in a short time. Wait about ${Math.ceil(limit.resetSeconds / 60)} minutes before sending another link.`,
      ),
    );
  }

  const guardianName = str(formData, "guardianName").trim();
  const guardianRelation = str(formData, "guardianRelation");
  const guardianPhoneInput = str(formData, "guardianPhone");
  const next = str(formData, "next") || "/jobs";

  if (!guardianName || guardianName.length < 2) {
    redirect(
      withError(
        `/onboarding/guardian?next=${encodeURIComponent(next)}`,
        "Enter your guardian's full name.",
      ),
    );
  }
  const allowedRelations = [
    "parent",
    "guardian",
    "family_member",
    "community_leader",
  ];
  if (!allowedRelations.includes(guardianRelation)) {
    redirect(
      withError(
        `/onboarding/guardian?next=${encodeURIComponent(next)}`,
        "Choose how this guardian is related to you.",
      ),
    );
  }
  const phoneParsed = phoneSchema.safeParse(guardianPhoneInput);
  if (!phoneParsed.success) {
    redirect(
      withError(
        `/onboarding/guardian?next=${encodeURIComponent(next)}`,
        phoneParsed.error.issues[0]?.message ?? "Enter a Ghana mobile number.",
      ),
    );
  }
  const guardianPhone = phoneParsed.data;

  const db = getDb();

  // Confirm the candidate is actually under 18 — this flow shouldn't fire for adults.
  const [u] = await db
    .select({ isUnder18: users.isUnder18 })
    .from(users)
    .where(eq(users.id, session.userId!))
    .limit(1);
  if (!u?.isUnder18) {
    redirect(withFlash(next, "You don't need guardian consent."));
  }

  const [profile] = await db
    .select({
      fullName: candidateProfiles.fullName,
      yearOfBirth: candidateProfiles.yearOfBirth,
    })
    .from(candidateProfiles)
    .where(eq(candidateProfiles.userId, session.userId!))
    .limit(1);
  if (!profile) redirect("/onboarding/candidate");

  const candidateAge = new Date().getFullYear() - profile.yearOfBirth;
  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + CONSENT_TTL_DAYS * 24 * 60 * 60 * 1000);

  // Record the request. We keep history rather than overwriting so the
  // candidate has an audit trail if guardian arrangements change.
  await db.insert(guardianConsents).values({
    candidateId: session.userId!,
    guardianName,
    guardianRelation,
    guardianPhone,
    token,
    expiresAt,
  });

  const appUrl = resolveAppUrl();
  const consentUrl = `${appUrl}/consent/${token}`;

  // SMS body must fit comfortably in two SMS pages and stay literal — guardians
  // may have low English confidence. Avoid jargon.
  const smsBody = [
    `Hi ${guardianName.split(" ")[0]},`,
    `${profile.fullName} (age ${candidateAge}) is signing up to Ghana Youth Jobs to find work.`,
    `As their ${guardianRelation.replace("_", " ")}, please review and approve here:`,
    consentUrl,
    `Link expires in ${CONSENT_TTL_DAYS} days. If this isn't you, ignore this message.`,
  ].join(" ");

  // Best-effort send. Even if SMS fails (e.g. provider stub or down), the
  // guardian record is saved and the candidate can re-request later.
  await sendSms(guardianPhone, smsBody);

  redirect(`/onboarding/guardian?next=${encodeURIComponent(next)}`);
}

function resolveAppUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "");
  if (!raw) return "https://ghanayouthjobs.app";
  return raw.replace(/\/+$/, "");
}
