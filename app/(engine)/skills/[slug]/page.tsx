import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { assessmentQuestions, skillBadges, skillsTaxonomy } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import {
  getActiveAssessment,
  getLatestAttempt,
} from "@/lib/assessments/queries";
import { getLocale, getTranslations } from "@/lib/i18n";
import { startAssessmentAction } from "../actions";

export default async function SkillAssessmentIntroPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string; flash?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const session = await getSession();
  if (!session.userId) redirect("/sign-in?intent=candidate");

  const { t } = await getTranslations();
  const locale = await getLocale();
  const db = getDb();

  const [skill] = await db
    .select()
    .from(skillsTaxonomy)
    .where(eq(skillsTaxonomy.slug, slug))
    .limit(1);
  if (!skill) notFound();

  const assessment = await getActiveAssessment(slug, locale);
  if (!assessment) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <Link
          href="/skills"
          className="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)]"
        >
          ← {t.skills.backToSkills}
        </Link>
        <h1 className="mt-3 text-2xl font-semibold">{skill.name}</h1>
        <p className="mt-3 text-sm text-[var(--color-muted)]">
          This skill is in the taxonomy but no assessment is published yet.
        </p>
      </section>
    );
  }

  const [questionCountRow] = await db
    .select({ id: assessmentQuestions.id })
    .from(assessmentQuestions)
    .where(eq(assessmentQuestions.assessmentId, assessment.id))
    .limit(1);
  // Cheap aggregation: count via a separate query for clarity.
  const allQuestions = await db
    .select({ id: assessmentQuestions.id })
    .from(assessmentQuestions)
    .where(eq(assessmentQuestions.assessmentId, assessment.id));
  const questionCount = allQuestions.length;
  void questionCountRow;

  const [held] = await db
    .select()
    .from(skillBadges)
    .where(
      and(
        eq(skillBadges.candidateId, session.userId!),
        eq(skillBadges.skillSlug, slug),
        isNull(skillBadges.revokedAt),
      ),
    )
    .limit(1);

  const latest = await getLatestAttempt(session.userId!, assessment.id);
  const buttonLabel = latest ? t.skills.retakeButton : t.skills.takeButton;

  return (
    <section className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link
        href="/skills"
        className="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)]"
      >
        ← {t.skills.backToSkills}
      </Link>

      <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">{assessment.title}</h1>
      <p className="mt-1 text-xs uppercase tracking-wider text-[var(--color-muted)]">
        {skill.category} · {skill.name}
      </p>

      {sp.flash && (
        <div className="mt-4 rounded-md border border-[var(--color-primary-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm">
          {sp.flash}
        </div>
      )}
      {sp.error && (
        <div className="mt-4 rounded-md border border-[var(--color-danger)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-danger)]">
          {sp.error}
        </div>
      )}

      <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-[var(--color-muted)]">
        {assessment.introText}
      </p>

      <dl className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
          <dt className="text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
            {questionCount} {t.skills.questionCount}
          </dt>
          <dd className="text-sm font-semibold">~{Math.max(2, questionCount)} min</dd>
        </div>
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
          <dt className="text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
            {t.skills.passingScore}
          </dt>
          <dd className="text-sm font-semibold">{assessment.passingScore}%</dd>
        </div>
      </dl>

      {held ? (
        <div className="mt-6 rounded-md border border-[var(--color-primary-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm">
          ✓ {t.skills.earned}
          {typeof held.score === "number" && (
            <span className="text-[var(--color-muted)]"> ({held.score}%)</span>
          )}
        </div>
      ) : (
        <form action={startAssessmentAction} className="mt-6">
          <input type="hidden" name="skillSlug" value={slug} />
          <button
            type="submit"
            className="rounded-md bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--color-primary-strong)]"
          >
            {buttonLabel}
          </button>
        </form>
      )}
    </section>
  );
}
