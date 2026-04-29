"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  candidateProfiles,
  employerProfiles,
  users,
} from "@/db/schema";
import { issueOtp, verifyOtp } from "@/lib/auth/otp";
import { getSession } from "@/lib/auth/session";
import { phoneSchema, otpSchema } from "@/lib/validation";
import { isAdminPhone } from "@/lib/setup";
import { str, withError } from "@/lib/forms";

export async function requestOtpAction(formData: FormData) {
  const intentRaw = str(formData, "intent");
  const intent =
    intentRaw === "employer" ? "employer" : "candidate";

  const parsed = phoneSchema.safeParse(str(formData, "phone"));
  if (!parsed.success) {
    redirect(
      withError(
        `/sign-in?intent=${intent}`,
        parsed.error.issues[0].message,
      ),
    );
  }
  const phone = parsed.data;

  const result = await issueOtp(phone);
  if (!result.ok) {
    redirect(
      withError(
        `/sign-in?intent=${intent}`,
        "Too many code requests for this number. Wait an hour and try again.",
      ),
    );
  }

  redirect(
    `/sign-in/verify?phone=${encodeURIComponent(phone)}&intent=${intent}`,
  );
}

export async function verifyOtpAction(formData: FormData) {
  const phoneParsed = phoneSchema.safeParse(str(formData, "phone"));
  const codeParsed = otpSchema.safeParse(str(formData, "code"));
  const intentRaw = str(formData, "intent");
  const intent = intentRaw === "employer" ? "employer" : "candidate";

  if (!phoneParsed.success) {
    redirect(withError("/sign-in", "Enter your phone again."));
  }
  if (!codeParsed.success) {
    redirect(
      withError(
        `/sign-in/verify?phone=${encodeURIComponent(phoneParsed.data)}&intent=${intent}`,
        codeParsed.error.issues[0].message,
      ),
    );
  }

  const phone = phoneParsed.data;
  const verify = await verifyOtp(phone, codeParsed.data);
  if (!verify.ok) {
    const reason =
      verify.reason === "expired"
        ? "That code expired. Request a new one."
        : verify.reason === "exhausted"
          ? "Too many wrong tries. Request a new code."
          : "That code doesn't match. Try again.";
    redirect(
      withError(
        `/sign-in/verify?phone=${encodeURIComponent(phone)}&intent=${intent}`,
        reason,
      ),
    );
  }

  // Find or create user.
  const db = getDb();
  let [user] = await db
    .select()
    .from(users)
    .where(eq(users.phone, phone))
    .limit(1);

  if (!user) {
    const role = isAdminPhone(phone) ? "admin" : intent;
    const [created] = await db
      .insert(users)
      .values({ phone, primaryRole: role })
      .returning();
    user = created;
  }

  if (user.bannedAt) {
    redirect(withError("/sign-in", "This account has been suspended."));
  }

  // Set session.
  const session = await getSession();
  session.userId = user.id;
  session.role = user.primaryRole as "candidate" | "employer" | "admin";
  session.isUnder18 = user.isUnder18;
  await session.save();

  // Decide where to send them.
  if (user.primaryRole === "admin") {
    redirect("/admin");
  }
  if (user.primaryRole === "candidate") {
    const [profile] = await db
      .select({ userId: candidateProfiles.userId })
      .from(candidateProfiles)
      .where(eq(candidateProfiles.userId, user.id))
      .limit(1);
    redirect(profile ? "/jobs" : "/onboarding/candidate");
  }
  // employer
  const [eprofile] = await db
    .select({ userId: employerProfiles.userId })
    .from(employerProfiles)
    .where(eq(employerProfiles.userId, user.id))
    .limit(1);
  redirect(eprofile ? "/employer" : "/onboarding/employer");
}
