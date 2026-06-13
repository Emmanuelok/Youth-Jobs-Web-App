import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { jobs, savedOpportunities } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { getTranslations } from "@/lib/i18n";
import { SaveButton } from "@/app/_components/save-button";

export default async function SavedPage() {
  const session = await getSession();
  if (!session.userId) redirect("/sign-in?intent=candidate");
  if (session.role !== "candidate" && session.role !== "admin") redirect("/");

  const { t } = await getTranslations();
  const db = getDb();

  const rows = await db
    .select({
      jobId: jobs.id,
      title: jobs.title,
      type: jobs.type,
      category: jobs.category,
      city: jobs.city,
      region: jobs.region,
      status: jobs.status,
      payAmountGhs: jobs.payAmountGhs,
      payPeriod: jobs.payPeriod,
      savedAt: savedOpportunities.createdAt,
    })
    .from(savedOpportunities)
    .innerJoin(jobs, eq(jobs.id, savedOpportunities.jobId))
    .where(eq(savedOpportunities.candidateId, session.userId!))
    .orderBy(desc(savedOpportunities.createdAt))
    .limit(100);

  return (
    <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold sm:text-3xl">{t.saved.title}</h1>

      <ul className="mt-6 space-y-3">
        {rows.length === 0 && (
          <li className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-6 text-sm text-[var(--color-muted)]">
            {t.saved.empty}{" "}
            <Link href="/jobs" className="underline hover:text-[var(--color-text)]">
              {t.saved.browse}
            </Link>
            .
          </li>
        )}
        {rows.map((r) => {
          const closed = r.status !== "published";
          return (
            <li
              key={r.jobId}
              className="flex items-start justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4"
            >
              <div className="min-w-0">
                <Link
                  href={`/jobs/${r.jobId}`}
                  className="text-sm font-semibold hover:underline"
                >
                  {r.title}
                </Link>
                <p className="mt-1 text-xs text-[var(--color-muted)]">
                  {r.category} · {r.city}, {r.region} · {r.type}
                </p>
                <p className="mt-1 text-xs text-[var(--color-muted)]">
                  {r.payAmountGhs
                    ? `GHS ${r.payAmountGhs.toLocaleString()} / ${r.payPeriod}`
                    : r.payPeriod}
                  {closed && " · no longer accepting applicants"}
                </p>
              </div>
              <SaveButton jobId={r.jobId} saved returnTo="/saved" />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
