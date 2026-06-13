import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  assessmentAttempts,
  assessmentQuestions,
} from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { getActiveAssessment } from "@/lib/assessments/queries";
import { normaliseAnswer } from "@/lib/assessments/grade";
import { getLocale, getTranslations } from "@/lib/i18n";

type Option = { id: string; text: string };

export default async function AssessmentResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ attempt?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const session = await getSession();
  if (!session.userId) redirect("/sign-in?intent=candidate");

  const { t } = await getTranslations();
  const locale = await getLocale();
  const db = getDb();

  if (!sp.attempt) redirect(`/skills/${slug}`);
  const [attempt] = await db
    .select()
    .from(assessmentAttempts)
    .where(eq(assessmentAttempts.id, sp.attempt))
    .limit(1);
  if (!attempt || attempt.candidateId !== session.userId) notFound();
  if (!attempt.completedAt) {
    redirect(`/skills/${slug}/take?attempt=${attempt.id}`);
  }

  const assessment = await getActiveAssessment(slug, locale);
  if (!assessment || assessment.id !== attempt.assessmentId) {
    redirect(`/skills/${slug}`);
  }

  const questions = await db
    .select()
    .from(assessmentQuestions)
    .where(eq(assessmentQuestions.assessmentId, assessment.id));

  const responses = (attempt.responses as Record<string, string> | null) ?? {};

  return (
    <section className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link
        href="/skills"
        className="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)]"
      >
        ← {t.skills.backToSkills}
      </Link>

      <div
        className={`mt-3 rounded-lg border p-5 ${
          attempt.passed
            ? "border-[var(--color-primary-strong)] bg-[var(--color-surface)]"
            : "border-[var(--color-accent)]/40 bg-[var(--color-surface)]"
        }`}
      >
        <p className="text-xs uppercase tracking-wider text-[var(--color-muted)]">
          {t.skills.yourScore}
        </p>
        <p className="mt-1 text-3xl font-semibold">{attempt.score ?? 0}%</p>
        <p className="mt-2 text-sm">
          {attempt.passed ? `✓ ${t.skills.youPassed}` : t.skills.youDidntPass}
        </p>
      </div>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">
        {t.skills.reviewExplanations}
      </h2>

      <ol className="mt-3 space-y-3">
        {questions
          .sort((a, b) => a.questionNumber - b.questionNumber)
          .map((q, idx) => {
            const submitted = normaliseAnswer(responses[q.id] ?? "");
            const accepted = (q.correctAnswers ?? []).map(normaliseAnswer);
            const correct =
              submitted.length > 0 && accepted.includes(submitted);

            const renderAnswer = (val: string) => {
              if (!val) return "—";
              const opts = (q.options as Option[] | null) ?? null;
              const match = opts?.find((o) => o.id === val);
              return match ? `${val.toUpperCase()}. ${match.text}` : val;
            };

            return (
              <li
                key={q.id}
                className={`rounded-md border px-4 py-3 ${
                  correct
                    ? "border-[var(--color-primary-strong)]/40 bg-[var(--color-surface)]"
                    : "border-[var(--color-danger)]/40 bg-[var(--color-surface)]"
                }`}
              >
                <p className="text-xs uppercase tracking-wider text-[var(--color-muted)]">
                  {t.skills.questionLabel} {idx + 1}
                </p>
                <p className="mt-1 text-sm">{q.prompt}</p>
                <p className="mt-2 text-xs text-[var(--color-muted)]">
                  {t.skills.youAnswered}: {renderAnswer(submitted)}{" "}
                  {correct ? (
                    <span className="text-[var(--color-primary-strong)]">
                      · {t.skills.correct}
                    </span>
                  ) : (
                    <span className="text-[var(--color-danger)]">
                      · {t.skills.incorrect}
                    </span>
                  )}
                </p>
                {!correct && (
                  <p className="mt-1 text-xs text-[var(--color-muted)]">
                    {t.skills.acceptedAnswers}:{" "}
                    {accepted.map(renderAnswer).join(" / ")}
                  </p>
                )}
                {q.explanation && (
                  <p className="mt-2 text-xs text-[var(--color-text)]">
                    {q.explanation}
                  </p>
                )}
              </li>
            );
          })}
      </ol>

      <div className="mt-8">
        <Link
          href={`/skills/${slug}`}
          className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm hover:border-[var(--color-primary-strong)]"
        >
          {t.skills.backToSkills}
        </Link>
      </div>
    </section>
  );
}
