import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  assessmentAttempts,
  assessmentQuestions,
  assessments,
  skillsTaxonomy,
} from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import {
  seedAssessmentsAction,
  toggleAssessmentActiveAction,
} from "./actions";

export default async function AdminAssessmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ flash?: string }>;
}) {
  const sp = await searchParams;
  const session = await getSession();
  if (!session.userId || session.role !== "admin") redirect("/");

  const db = getDb();

  const rows = await db
    .select({
      id: assessments.id,
      title: assessments.title,
      skillSlug: assessments.skillSlug,
      skillName: skillsTaxonomy.name,
      language: assessments.language,
      passingScore: assessments.passingScore,
      isActive: assessments.isActive,
      createdAt: assessments.createdAt,
      questionCount: sql<number>`(
        select count(*)::int from ${assessmentQuestions}
        where ${assessmentQuestions.assessmentId} = ${assessments.id}
      )`,
      attemptCount: sql<number>`(
        select count(*)::int from ${assessmentAttempts}
        where ${assessmentAttempts.assessmentId} = ${assessments.id}
      )`,
    })
    .from(assessments)
    .leftJoin(skillsTaxonomy, eq(skillsTaxonomy.slug, assessments.skillSlug))
    .orderBy(desc(assessments.createdAt));

  return (
    <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">
            Assessments
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Skill assessments published to candidates. Toggle active to hide a
            version without losing attempt history.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={seedAssessmentsAction}>
            <button
              type="submit"
              className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs hover:border-[var(--color-primary-strong)]"
            >
              Seed starter content
            </button>
          </form>
          <Link
            href="/admin/assessments/new"
            className="rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-primary-strong)]"
          >
            Create new
          </Link>
        </div>
      </header>

      {sp.flash && (
        <div className="mt-4 rounded-md border border-[var(--color-primary-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm">
          {sp.flash}
        </div>
      )}

      <ul className="mt-6 space-y-3">
        {rows.length === 0 && (
          <li className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-6 text-sm text-[var(--color-muted)]">
            No assessments yet. Click &quot;Seed starter content&quot; to publish
            the built-in English-reading + customer-service assessments.
          </li>
        )}
        {rows.map((r) => (
          <li
            key={r.id}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{r.title}</p>
                <p className="mt-1 text-xs text-[var(--color-muted)]">
                  {r.skillName ?? r.skillSlug} · {r.language} · pass {r.passingScore}%
                </p>
                <p className="mt-1 text-xs text-[var(--color-muted)]">
                  {r.questionCount} questions · {r.attemptCount} attempts
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                    r.isActive
                      ? "bg-[var(--color-primary)]/15 text-[var(--color-primary-strong)]"
                      : "border border-[var(--color-border)] text-[var(--color-muted)]"
                  }`}
                >
                  {r.isActive ? "active" : "inactive"}
                </span>
                <form action={toggleAssessmentActiveAction}>
                  <input type="hidden" name="id" value={r.id} />
                  <input
                    type="hidden"
                    name="active"
                    value={r.isActive ? "false" : "true"}
                  />
                  <button
                    type="submit"
                    className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs hover:border-[var(--color-primary-strong)]"
                  >
                    {r.isActive ? "Deactivate" : "Activate"}
                  </button>
                </form>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
