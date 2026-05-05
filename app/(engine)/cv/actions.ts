"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  candidateProfiles,
  generatedCvs,
  users,
} from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { generateCv } from "@/lib/ai/cv";
import { checkLimit } from "@/lib/ratelimit";
import { str, withError } from "@/lib/forms";

export async function generateCvAction(formData: FormData) {
  const session = await getSession();
  if (!session.userId) redirect("/sign-in?intent=candidate");

  const limit = await checkLimit("cv_generate", session.userId);
  if (!limit.ok) {
    redirect(
      withError(
        "/cv",
        `You can regenerate your CV again in about ${Math.ceil(limit.resetSeconds / 60)} minutes.`,
      ),
    );
  }

  const rawNotes = str(formData, "rawNotes").slice(0, 2000) || undefined;
  const db = getDb();

  const [profile] = await db
    .select()
    .from(candidateProfiles)
    .where(eq(candidateProfiles.userId, session.userId!))
    .limit(1);
  if (!profile) redirect("/onboarding/candidate");

  const [user] = await db
    .select({ isUnder18: users.isUnder18 })
    .from(users)
    .where(eq(users.id, session.userId!))
    .limit(1);

  if (!process.env.ANTHROPIC_API_KEY) {
    redirect(
      withError(
        "/cv",
        "AI CV generator isn't configured yet. Set ANTHROPIC_API_KEY in Vercel env vars.",
      ),
    );
  }

  let result;
  try {
    result = await generateCv({
      profile: {
        fullName: profile.fullName,
        city: profile.city,
        region: profile.region,
        yearOfBirth: profile.yearOfBirth,
        educationLevel: profile.educationLevel,
        skills: profile.skills,
        languages: profile.languages,
        availability: profile.availability,
        bio: profile.bio,
        isUnder18: user?.isUnder18 ?? false,
      },
      rawNotes,
    });
  } catch (err) {
    redirect(
      withError(
        "/cv",
        `Couldn't generate the CV: ${
          err instanceof Error ? err.message : String(err)
        }`,
      ),
    );
  }

  await db.insert(generatedCvs).values({
    candidateId: session.userId!,
    payload: result.cv,
    promptInputs: { rawNotes },
    modelId: result.modelId,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    cacheReadTokens: result.cacheReadTokens,
  });

  redirect("/cv");
}
