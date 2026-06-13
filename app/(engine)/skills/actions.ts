"use server";

import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  assessmentAttempts,
  skillBadges,
} from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import {
  gradeAssessment,
  normaliseAnswer,
  type SubmittedResponses,
} from "@/lib/assessments/grade";
import {
  getActiveAssessment,
  getLatestAttempt,
  getQuestionsForAssessment,
  getRecentAttemptCount,
} from "@/lib/assessments/queries";
import { getLocale } from "@/lib/i18n";
import { log } from "@/lib/log";
import { checkLimit } from "@/lib/ratelimit";
import { str, withError, withFlash } from "@/lib/forms";

const COOLDOWN_HOURS_AFTER_FAIL = 24;
const MAX_ATTEMPTS_PER_30_DAYS = 5;

/**
 * Start (or resume) an attempt. We deliberately allow only one in-flight
 * attempt per (candidate, assessment) — if one is already started but not
 * completed, the candidate is sent to its take page rather than starting a
 * second. This keeps grading honest without locking anyone out.
 */
export async function startAssessmentAction(formData: FormData) {
  const session = await getSession();
  if (!session.userId) redirect("/sign-in?intent=candidate");

  const skillSlug = str(formData, "skillSlug");
  if (!skillSlug) redirect("/skills");

  const rl = await checkLimit("cv_generate", session.userId); // reuse a tight per-hour limiter
  if (!rl.ok) {
    redirect(
      withError(
        `/skills/${skillSlug}`,
        `Please wait ${Math.ceil(rl.resetSeconds / 60)} minutes before another try.`,
      ),
    );
  }

  const locale = await getLocale();
  const assessment = await getActiveAssessment(skillSlug, locale);
  if (!assessment) {
    redirect(withError("/skills", "That assessment is not available yet."));
  }

  // If they already passed, no need to take it again.
  const db = getDb();
  const [existingBadge] = await db
    .select({ id: skillBadges.id })
    .from(skillBadges)
    .where(
      and(
        eq(skillBadges.candidateId, session.userId!),
        eq(skillBadges.skillSlug, skillSlug),
        isNull(skillBadges.revokedAt),
      ),
    )
    .limit(1);
  if (existingBadge) {
    redirect(
      withFlash(`/skills/${skillSlug}`, "You already hold this badge."),
    );
  }

  // Cooldown: if last completed attempt failed within COOLDOWN_HOURS_AFTER_FAIL, wait.
  const latest = await getLatestAttempt(session.userId!, assessment.id);
  if (
    latest?.completedAt &&
    latest.passed === false &&
    Date.now() - latest.completedAt.getTime() <
      COOLDOWN_HOURS_AFTER_FAIL * 60 * 60 * 1000
  ) {
    const hoursLeft = Math.ceil(
      (COOLDOWN_HOURS_AFTER_FAIL * 60 * 60 * 1000 -
        (Date.now() - latest.completedAt.getTime())) /
        (60 * 60 * 1000),
    );
    redirect(
      withError(
        `/skills/${skillSlug}`,
        `You can re-take this in about ${hoursLeft} hour(s). Use the time to review the explanations.`,
      ),
    );
  }

  // Attempt cap over 30 days.
  const recentCount = await getRecentAttemptCount(
    session.userId!,
    assessment.id,
    30 * 24,
  );
  if (recentCount >= MAX_ATTEMPTS_PER_30_DAYS) {
    redirect(
      withError(
        `/skills/${skillSlug}`,
        "You have reached the monthly attempt limit. Try again next month.",
      ),
    );
  }

  // Resume an in-flight attempt rather than starting a new one.
  if (latest && !latest.completedAt) {
    redirect(`/skills/${skillSlug}/take?attempt=${latest.id}`);
  }

  const [created] = await db
    .insert(assessmentAttempts)
    .values({
      candidateId: session.userId!,
      assessmentId: assessment.id,
    })
    .returning({ id: assessmentAttempts.id });

  log.info("assessment.started", {
    candidate: session.userId,
    skill: skillSlug,
    attempt: created?.id,
  });

  redirect(`/skills/${skillSlug}/take?attempt=${created!.id}`);
}

/**
 * Grade and persist. Idempotent on the attempt row — if it's already been
 * completed we just redirect to the result page instead of re-grading.
 */
export async function submitAssessmentAction(formData: FormData) {
  const session = await getSession();
  if (!session.userId) redirect("/sign-in?intent=candidate");

  const skillSlug = str(formData, "skillSlug");
  const attemptId = str(formData, "attemptId");
  if (!skillSlug || !attemptId) redirect("/skills");

  const db = getDb();
  const [attempt] = await db
    .select()
    .from(assessmentAttempts)
    .where(eq(assessmentAttempts.id, attemptId))
    .limit(1);

  if (
    !attempt ||
    attempt.candidateId !== session.userId ||
    !attempt.assessmentId
  ) {
    redirect(withError("/skills", "That assessment attempt is not yours."));
  }

  // Already graded — bounce to the result.
  if (attempt.completedAt) {
    redirect(`/skills/${skillSlug}/result?attempt=${attempt.id}`);
  }

  const locale = await getLocale();
  const assessment = await getActiveAssessment(skillSlug, locale);
  if (!assessment || assessment.id !== attempt.assessmentId) {
    redirect(withError("/skills", "That assessment is no longer available."));
  }

  const questions = await getQuestionsForAssessment(assessment.id);
  if (questions.length === 0) {
    redirect(withError("/skills", "That assessment has no questions."));
  }

  // Build the responses map: every question prefixed `q_<id>` in the form.
  const submitted: SubmittedResponses = {};
  for (const q of questions) {
    const raw = formData.get(`q_${q.id}`);
    submitted[q.id] = typeof raw === "string" ? normaliseAnswer(raw) : "";
  }

  const result = gradeAssessment(questions, submitted, assessment.passingScore);

  const now = new Date();
  await db
    .update(assessmentAttempts)
    .set({
      score: result.score,
      passed: result.passed,
      responses: result.normalisedResponses,
      completedAt: now,
    })
    .where(eq(assessmentAttempts.id, attempt.id));

  if (result.passed) {
    // Issue (or refresh) the badge. Unique constraint covers race conditions.
    await db
      .insert(skillBadges)
      .values({
        candidateId: session.userId!,
        skillSlug: assessment.skillSlug,
        source: "assessment",
        attemptId: attempt.id,
        score: result.score,
        earnedAt: now,
      })
      .onConflictDoUpdate({
        target: [skillBadges.candidateId, skillBadges.skillSlug],
        set: {
          source: "assessment",
          attemptId: attempt.id,
          score: result.score,
          earnedAt: now,
          revokedAt: null,
          revokedReason: null,
        },
      });
  }

  log.info("assessment.completed", {
    candidate: session.userId,
    skill: skillSlug,
    attempt: attempt.id,
    score: result.score,
    passed: result.passed,
  });

  redirect(`/skills/${skillSlug}/result?attempt=${attempt.id}`);
}
