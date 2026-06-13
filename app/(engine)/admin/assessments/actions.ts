"use server";

import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  assessmentQuestions,
  assessments,
  skillsTaxonomy,
} from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { SEED_ASSESSMENTS } from "@/lib/assessments/seed";
import { log } from "@/lib/log";
import { bool, num, str, withError, withFlash } from "@/lib/forms";

async function requireAdmin(): Promise<string> {
  const session = await getSession();
  if (!session.userId || session.role !== "admin") redirect("/");
  return session.userId;
}

/**
 * One-click seed of the starter content in lib/assessments/seed.ts. Safe to
 * re-run: existing skills are left alone (no overwrite), and existing
 * assessments for a seeded skill are left in place — the action only
 * creates skills + assessments that don't yet exist.
 */
export async function seedAssessmentsAction(_formData: FormData) {
  const adminId = await requireAdmin();
  const db = getDb();

  let skillsCreated = 0;
  let assessmentsCreated = 0;
  let questionsCreated = 0;

  for (const seed of SEED_ASSESSMENTS) {
    // 1. Skill row (idempotent via onConflictDoNothing on PK).
    const skillResult = await db
      .insert(skillsTaxonomy)
      .values({
        slug: seed.skillSlug,
        name: seed.skillName,
        category: seed.skillCategory,
        description: seed.skillDescription,
      })
      .onConflictDoNothing()
      .returning({ slug: skillsTaxonomy.slug });
    if (skillResult.length > 0) skillsCreated += 1;

    // 2. Skip if an active English assessment already exists for this skill.
    const [existing] = await db
      .select({ id: assessments.id })
      .from(assessments)
      .where(
        and(
          eq(assessments.skillSlug, seed.skillSlug),
          eq(assessments.language, "en"),
          eq(assessments.isActive, true),
        ),
      )
      .limit(1);
    if (existing) continue;

    // 3. Create the assessment + its questions.
    const [created] = await db
      .insert(assessments)
      .values({
        skillSlug: seed.skillSlug,
        title: seed.title,
        introText: seed.introText,
        passingScore: seed.passingScore,
        language: "en",
        isActive: true,
        createdBy: adminId,
      })
      .returning({ id: assessments.id });
    if (!created) continue;
    assessmentsCreated += 1;

    for (let i = 0; i < seed.questions.length; i++) {
      const q = seed.questions[i];
      await db.insert(assessmentQuestions).values({
        assessmentId: created.id,
        questionNumber: i + 1,
        prompt: q.prompt,
        questionType: q.questionType,
        options: q.options ?? null,
        correctAnswers: q.correctAnswers,
        explanation: q.explanation ?? null,
        points: q.points ?? 1,
      });
      questionsCreated += 1;
    }
  }

  log.info("assessment.seeded", {
    actor: adminId,
    skillsCreated,
    assessmentsCreated,
    questionsCreated,
  });

  redirect(
    withFlash(
      "/admin/assessments",
      `Seeded ${skillsCreated} skills, ${assessmentsCreated} assessments, ${questionsCreated} questions.`,
    ),
  );
}

/**
 * Toggle isActive on an assessment. Useful to retire a version without
 * deleting the data (attempts still reference it via FK).
 */
export async function toggleAssessmentActiveAction(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "id");
  const next = bool(formData, "active");
  if (!id) redirect("/admin/assessments");
  const db = getDb();
  await db
    .update(assessments)
    .set({ isActive: next, updatedAt: new Date() })
    .where(eq(assessments.id, id));
  redirect("/admin/assessments");
}

/**
 * Minimal manual-create flow: an admin can spin up a new assessment with
 * just the metadata, then add questions one-by-one. We deliberately keep
 * the question editor extremely simple — power users will edit JSON
 * directly through psql or a future bulk-import.
 */
export async function createBlankAssessmentAction(formData: FormData) {
  const adminId = await requireAdmin();
  const db = getDb();

  const skillSlug = str(formData, "skillSlug").trim().toLowerCase();
  const skillName = str(formData, "skillName").trim();
  const skillCategory = str(formData, "skillCategory").trim();
  const skillDescription = str(formData, "skillDescription").trim();
  const title = str(formData, "title").trim();
  const introText = str(formData, "introText").trim();
  const passingScore = num(formData, "passingScore") ?? 70;
  const language = str(formData, "language").trim() || "en";

  if (!skillSlug || !skillName || !title || !introText) {
    redirect(
      withError(
        "/admin/assessments/new",
        "Skill slug, skill name, title, and intro text are all required.",
      ),
    );
  }

  // Upsert skill.
  await db
    .insert(skillsTaxonomy)
    .values({
      slug: skillSlug,
      name: skillName,
      category: skillCategory || "other",
      description: skillDescription || skillName,
    })
    .onConflictDoNothing();

  const [created] = await db
    .insert(assessments)
    .values({
      skillSlug,
      title,
      introText,
      passingScore: Math.max(0, Math.min(100, passingScore)),
      language,
      isActive: false, // require explicit activation once questions are added
      createdBy: adminId,
    })
    .returning({ id: assessments.id });

  log.info("assessment.created", {
    actor: adminId,
    skillSlug,
    assessmentId: created?.id,
  });

  redirect(`/admin/assessments`);
}
