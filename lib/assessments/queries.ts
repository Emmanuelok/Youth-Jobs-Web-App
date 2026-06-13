import { and, desc, eq, gt, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  assessmentAttempts,
  assessmentQuestions,
  assessments,
  skillBadges,
  skillsTaxonomy,
  type Assessment,
  type AssessmentQuestion,
  type SkillBadge,
} from "@/db/schema";

/** All skills in the taxonomy, ordered by category then name. */
export async function listSkills() {
  const db = getDb();
  return db.select().from(skillsTaxonomy);
}

/**
 * The active assessment for a skill in the requested language. Falls back
 * to English if the requested locale has no active assessment.
 */
export async function getActiveAssessment(
  skillSlug: string,
  language: string,
): Promise<Assessment | null> {
  const db = getDb();
  const [primary] = await db
    .select()
    .from(assessments)
    .where(
      and(
        eq(assessments.skillSlug, skillSlug),
        eq(assessments.language, language),
        eq(assessments.isActive, true),
      ),
    )
    .orderBy(desc(assessments.createdAt))
    .limit(1);
  if (primary) return primary;

  if (language !== "en") {
    const [fallback] = await db
      .select()
      .from(assessments)
      .where(
        and(
          eq(assessments.skillSlug, skillSlug),
          eq(assessments.language, "en"),
          eq(assessments.isActive, true),
        ),
      )
      .orderBy(desc(assessments.createdAt))
      .limit(1);
    return fallback ?? null;
  }
  return null;
}

export async function getQuestionsForAssessment(
  assessmentId: string,
): Promise<AssessmentQuestion[]> {
  const db = getDb();
  return db
    .select()
    .from(assessmentQuestions)
    .where(eq(assessmentQuestions.assessmentId, assessmentId));
}

/** Most recent attempt by this candidate at this assessment, completed or not. */
export async function getLatestAttempt(
  candidateId: string,
  assessmentId: string,
) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(assessmentAttempts)
    .where(
      and(
        eq(assessmentAttempts.candidateId, candidateId),
        eq(assessmentAttempts.assessmentId, assessmentId),
      ),
    )
    .orderBy(desc(assessmentAttempts.startedAt))
    .limit(1);
  return row ?? null;
}

/** Active (not revoked, not expired) badges for a candidate. */
export async function getActiveBadges(
  candidateId: string,
): Promise<SkillBadge[]> {
  const db = getDb();
  const now = new Date();
  const rows = await db
    .select()
    .from(skillBadges)
    .where(
      and(
        eq(skillBadges.candidateId, candidateId),
        isNull(skillBadges.revokedAt),
      ),
    );
  return rows.filter((b) => !b.expiresAt || b.expiresAt > now);
}

/** Batched: which skill slugs each candidate holds. One query for a list page. */
export async function getActiveBadgeSlugsByCandidate(
  candidateIds: string[],
): Promise<Map<string, string[]>> {
  if (candidateIds.length === 0) return new Map();
  const db = getDb();
  const now = new Date();
  const rows = await db
    .select({
      candidateId: skillBadges.candidateId,
      skillSlug: skillBadges.skillSlug,
      expiresAt: skillBadges.expiresAt,
    })
    .from(skillBadges)
    .where(
      and(
        inArray(skillBadges.candidateId, candidateIds),
        isNull(skillBadges.revokedAt),
      ),
    );
  const out = new Map<string, string[]>();
  for (const r of rows) {
    if (r.expiresAt && r.expiresAt <= now) continue;
    const arr = out.get(r.candidateId) ?? [];
    arr.push(r.skillSlug);
    out.set(r.candidateId, arr);
  }
  return out;
}

/**
 * Attempts in the last `hours` for this candidate at this assessment.
 * Used by the rate-limit / cooldown gate in the start action.
 */
export async function getRecentAttemptCount(
  candidateId: string,
  assessmentId: string,
  hours: number,
): Promise<number> {
  const db = getDb();
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const rows = await db
    .select({ id: assessmentAttempts.id })
    .from(assessmentAttempts)
    .where(
      and(
        eq(assessmentAttempts.candidateId, candidateId),
        eq(assessmentAttempts.assessmentId, assessmentId),
        gt(assessmentAttempts.startedAt, since),
      ),
    );
  return rows.length;
}
