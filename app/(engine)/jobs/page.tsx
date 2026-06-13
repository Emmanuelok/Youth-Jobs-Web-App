import Link from "next/link";
import { and, desc, eq, ilike } from "drizzle-orm";
import { getDb } from "@/db/client";
import { jobs } from "@/db/schema";
import { GHANA_REGIONS, JOB_CATEGORIES } from "@/lib/ghana";
import { getSession } from "@/lib/auth/session";
import { getSavedJobIdSet } from "@/lib/saved";
import { SaveButton } from "@/app/_components/save-button";

const inputCls =
  "w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary-strong)] focus:outline-none";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string;
    region?: string;
    q?: string;
    category?: string;
  }>;
}) {
  const sp = await searchParams;
  const db = getDb();

  const conditions = [eq(jobs.status, "published")];
  if (sp.type && ["job", "apprenticeship", "internship", "gig"].includes(sp.type)) {
    conditions.push(eq(jobs.type, sp.type));
  }
  if (sp.region && (GHANA_REGIONS as readonly string[]).includes(sp.region)) {
    conditions.push(eq(jobs.region, sp.region));
  }
  if (sp.category) {
    conditions.push(eq(jobs.category, sp.category));
  }
  if (sp.q && sp.q.trim().length > 0) {
    conditions.push(ilike(jobs.title, `%${sp.q.trim()}%`));
  }

  const rows = await db
    .select()
    .from(jobs)
    .where(and(...conditions))
    .orderBy(desc(jobs.publishedAt))
    .limit(50);

  // Saved state — only for signed-in candidates; one query for the page.
  const session = await getSession();
  const canSave = session.userId && session.role !== "employer";
  const savedSet =
    canSave && session.userId
      ? await getSavedJobIdSet(
          session.userId,
          rows.map((r) => r.id),
        )
      : new Set<string>();

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold sm:text-3xl">Find work in Ghana</h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Verified jobs, apprenticeships, internships and short gigs. Free to
        apply. If anyone asks for money to give you a job, report it.
      </p>

      <form className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-4">
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Search by job title"
          className={`${inputCls} sm:col-span-2`}
        />
        <select name="region" defaultValue={sp.region ?? ""} className={inputCls}>
          <option value="">All regions</option>
          {GHANA_REGIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <select name="type" defaultValue={sp.type ?? ""} className={inputCls}>
          <option value="">All types</option>
          <option value="job">Job</option>
          <option value="apprenticeship">Apprenticeship</option>
          <option value="internship">Internship</option>
          <option value="gig">Gig</option>
        </select>
        <select
          name="category"
          defaultValue={sp.category ?? ""}
          className={`${inputCls} sm:col-span-3`}
        >
          <option value="">All categories</option>
          {JOB_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-primary-strong)]"
        >
          Filter
        </button>
      </form>

      <ul className="mt-8 space-y-3">
        {rows.length === 0 && (
          <li className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-6 text-sm text-[var(--color-muted)]">
            No published opportunities match these filters yet. Try clearing
            them, or check back tomorrow — we add new listings every day.
          </li>
        )}
        {rows.map((j) => (
          <li
            key={j.id}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link
                  href={`/jobs/${j.id}`}
                  className="text-base font-semibold hover:underline"
                >
                  {j.title}
                </Link>
                <p className="mt-1 text-xs text-[var(--color-muted)]">
                  {j.category} · {j.city}, {j.region}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
                  {j.type}
                </span>
                {canSave && (
                  <SaveButton
                    jobId={j.id}
                    saved={savedSet.has(j.id)}
                    returnTo="/jobs"
                  />
                )}
              </div>
            </div>
            <p className="mt-3 line-clamp-2 text-sm text-[var(--color-muted)]">
              {j.description.slice(0, 220)}
              {j.description.length > 220 && "…"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--color-muted)]">
              {j.payAmountGhs ? (
                <span className="rounded-full bg-[var(--color-surface-2)] px-2 py-1">
                  GHS {j.payAmountGhs.toLocaleString()} / {j.payPeriod}
                </span>
              ) : (
                <span className="rounded-full bg-[var(--color-surface-2)] px-2 py-1">
                  {j.payPeriod === "unpaid_with_skills"
                    ? "Unpaid · skills training"
                    : "See details"}
                </span>
              )}
              <span className="rounded-full bg-[var(--color-surface-2)] px-2 py-1">
                Min age {j.minimumAge}
              </span>
              {j.isHazardous && (
                <span className="rounded-full bg-[var(--color-danger)]/20 px-2 py-1 text-[var(--color-danger)]">
                  Hazardous trade — 18+ only
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
