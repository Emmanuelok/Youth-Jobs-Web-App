import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { assessmentAttempts } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import {
  getActiveAssessment,
  getQuestionsForAssessment,
} from "@/lib/assessments/queries";
import { seededShuffle } from "@/lib/assessments/grade";
import { getLocale, getTranslations } from "@/lib/i18n";
import { submitAssessmentAction } from "../../actions";

type Option = { id: string; text: string };

const labelCls =
  "block text-xs uppercase tracking-wider text-[var(--color-muted)]";

export default async function TakeAssessmentPage({
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

  const attemptId = sp.attempt;
  if (!attemptId) redirect(`/skills/${slug}`);

  const [attempt] = await db
    .select()
    .from(assessmentAttempts)
    .where(eq(assessmentAttempts.id, attemptId))
    .limit(1);
  if (!attempt || attempt.candidateId !== session.userId) notFound();
  if (attempt.completedAt) {
    redirect(`/skills/${slug}/result?attempt=${attempt.id}`);
  }

  const assessment = await getActiveAssessment(slug, locale);
  if (!assessment || assessment.id !== attempt.assessmentId) {
    redirect(`/skills/${slug}`);
  }

  const questions = await getQuestionsForAssessment(assessment.id);
  // Deterministic, per-attempt shuffle (the seed is the attempt id) so a
  // refresh keeps the same order. Shuffle question order; do not shuffle
  // option order within a question (the options carry stable ids that the
  // submission relies on for grading).
  const ordered = seededShuffle(
    [...questions].sort((a, b) => a.questionNumber - b.questionNumber),
    attempt.id,
  );

  return (
    <section className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-xl font-semibold sm:text-2xl">{assessment.title}</h1>
      <p className="mt-1 text-xs text-[var(--color-muted)]">
        {ordered.length} {t.skills.questionCount}
      </p>

      <form action={submitAssessmentAction} className="mt-6 space-y-6">
        <input type="hidden" name="skillSlug" value={slug} />
        <input type="hidden" name="attemptId" value={attempt.id} />

        {ordered.map((q, idx) => {
          const fieldName = `q_${q.id}`;
          return (
            <fieldset
              key={q.id}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
            >
              <legend className={labelCls}>
                {t.skills.questionLabel} {idx + 1} {t.skills.of} {ordered.length}
              </legend>
              <p className="mt-2 text-sm leading-relaxed">{q.prompt}</p>

              {q.questionType === "multiple_choice" && (
                <div className="mt-4 space-y-2">
                  {((q.options as Option[] | null) ?? []).map((opt) => (
                    <label
                      key={opt.id}
                      className="flex cursor-pointer items-start gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm hover:border-[var(--color-primary-strong)]"
                    >
                      <input
                        type="radio"
                        name={fieldName}
                        value={opt.id}
                        required
                        className="mt-1"
                      />
                      <span>{opt.text}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.questionType === "true_false" && (
                <div className="mt-4 flex gap-2">
                  {(
                    ((q.options as Option[] | null) ?? [
                      { id: "true", text: "True" },
                      { id: "false", text: "False" },
                    ])
                  ).map((opt) => (
                    <label
                      key={opt.id}
                      className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm hover:border-[var(--color-primary-strong)]"
                    >
                      <input
                        type="radio"
                        name={fieldName}
                        value={opt.id}
                        required
                      />
                      <span>{opt.text}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.questionType === "short_text_match" && (
                <input
                  type="text"
                  name={fieldName}
                  required
                  maxLength={200}
                  className="mt-3 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm focus:border-[var(--color-primary-strong)] focus:outline-none"
                />
              )}
            </fieldset>
          );
        })}

        <button
          type="submit"
          className="w-full rounded-md bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--color-primary-strong)]"
        >
          {t.skills.submitAnswers}
        </button>
      </form>
    </section>
  );
}
