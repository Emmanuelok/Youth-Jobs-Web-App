"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { candidateProfiles, users } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { candidateProfileSchema } from "@/lib/validation";
import { num, str, strs, withError } from "@/lib/forms";

export async function saveCandidateProfileAction(formData: FormData) {
  const session = await getSession();
  if (!session.userId) redirect("/sign-in?intent=candidate");

  const parsed = candidateProfileSchema.safeParse({
    fullName: str(formData, "fullName"),
    city: str(formData, "city"),
    region: str(formData, "region"),
    educationLevel: str(formData, "educationLevel"),
    skills: str(formData, "skills")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 5),
    languages: strs(formData, "languages"),
    availability: str(formData, "availability"),
    yearOfBirth: num(formData, "yearOfBirth") ?? 0,
    guardianContact: str(formData, "guardianContact") || undefined,
    bio: str(formData, "bio") || undefined,
  });

  if (!parsed.success) {
    redirect(
      withError(
        "/onboarding/candidate",
        parsed.error.issues[0]?.message ?? "Please check the form.",
      ),
    );
  }

  const data = parsed.data;
  const age = new Date().getFullYear() - data.yearOfBirth;
  const isUnder18 = age < 18;

  if (isUnder18 && !data.guardianContact) {
    redirect(
      withError(
        "/onboarding/candidate",
        "If you are under 18 we need a guardian's phone number for safety.",
      ),
    );
  }

  const db = getDb();

  // neon-http does not support transactions; sequence the two writes.
  await db
    .update(users)
    .set({ isUnder18, updatedAt: new Date() })
    .where(eq(users.id, session.userId!));

  await db
    .insert(candidateProfiles)
    .values({
      userId: session.userId!,
      fullName: data.fullName,
      city: data.city,
      region: data.region,
      educationLevel: data.educationLevel,
      skills: data.skills,
      languages: data.languages,
      availability: data.availability,
      yearOfBirth: data.yearOfBirth,
      guardianContact: data.guardianContact,
      bio: data.bio,
    })
    .onConflictDoUpdate({
      target: candidateProfiles.userId,
      set: {
        fullName: data.fullName,
        city: data.city,
        region: data.region,
        educationLevel: data.educationLevel,
        skills: data.skills,
        languages: data.languages,
        availability: data.availability,
        yearOfBirth: data.yearOfBirth,
        guardianContact: data.guardianContact,
        bio: data.bio,
        updatedAt: new Date(),
      },
    });

  // Refresh session under-18 flag.
  const newSession = await getSession();
  newSession.isUnder18 = isUnder18;
  await newSession.save();

  redirect("/jobs");
}
