import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  applications,
  employerProfiles,
  jobs,
} from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { withdrawApplicationAction } from "./actions";

export default async function MyApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ flash?: string }>;
}) {
  const sp = await searchParams;
  const session = await getSession();
  if (!session.userId) redirect("/sign-in?intent=candidate");
  if (session.role !== "candidate" && session.role !== "admin") {
    redirect("/");
  }

  const db = getDb();
  const rows = await db
    .select({
      id: applications.id,
      status: applications.status,
      message: applications.message,
      createdAt: applications.createdAt,
      acknowledgedTermsAt: applications.acknowledgedTermsAt,
      jobId: jobs.id,
      jobTitle: jobs.title,
      jobType: jobs.type,
      jobCity: jobs.city,
      jobRegion: jobs.region,
      jobStatus: jobs.status,
      organizationName: employerProfiles.organizationName,
      verifiedAt: employerProfiles.verifiedAt,
    })
    .from(applications)
    .leftJoin(jobs, eq(jobs.id, applications.jobId))
    .leftJoin(
      employerProfiles,
      eq(employerProfiles.userId, jobs.employerId),
    )
    .where(eq(applications.candidateId, session.userId!))
    .orderBy(desc(applications.createdAt))
    .limit(100);

  return (
    <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold sm:text-3xl">My applications</h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Every job, apprenticeship, internship, or gig you&apos;ve applied to.
        Use Messages to talk to employers — never share OTP codes or send
        money.
      </p>

      {sp.flash && (
        <div className="mt-4 rounded-md border border-[var(--color-primary-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm">
          {sp.flash}
        </div>
      )}

      <ul className="mt-6 space-y-3">
        {rows.length === 0 && (
          <li className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-6 text-sm text-[var(--color-muted)]">
            You haven&apos;t applied to anything yet.{" "}
            <Link href="/jobs" className="underline hover:text-[var(--color-text)]">
              Browse opportunities
            </Link>
            .
          </li>
        )}
        {rows.map((r) => (
          <li
            key={r.id}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                {r.jobId ? (
                  <Link
                    href={`/jobs/${r.jobId}`}
                    className="text-sm font-semibold hover:underline"
                  >
                    {r.jobTitle}
                  </Link>
                ) : (
                  <p className="text-sm font-semibold">(job no longer available)</p>
                )}
                <p className="mt-1 text-xs text-[var(--color-muted)]">
                  {r.organizationName ?? "Verified employer"}
                  {r.verifiedAt && " · ✓ verified"}
                  {r.jobCity && ` · ${r.jobCity}, ${r.jobRegion}`}
                  {r.jobType && ` · ${r.jobType}`}
                </p>
                <p className="mt-1 text-xs text-[var(--color-muted)]">
                  Applied {new Date(r.createdAt).toLocaleDateString()}
                </p>
                {r.message && (
                  <p className="mt-2 line-clamp-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-xs">
                    {r.message}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                    r.status === "hired"
                      ? "bg-[var(--color-primary)]/15 text-[var(--color-primary-strong)]"
                      : r.status === "rejected"
                        ? "bg-[var(--color-danger)]/15 text-[var(--color-danger)]"
                        : r.status === "shortlisted"
                          ? "bg-[var(--color-accent)]/20 text-[var(--color-accent)]"
                          : "border border-[var(--color-border)] text-[var(--color-muted)]"
                  }`}
                >
                  {r.status}
                </span>
                {r.jobType === "apprenticeship" && r.jobId && (
                  <Link
                    href={`/jobs/${r.jobId}/agreement`}
                    className="text-[10px] uppercase tracking-wider text-[var(--color-muted)] underline hover:text-[var(--color-text)]"
                  >
                    View agreement
                  </Link>
                )}
                {r.status !== "withdrawn" && r.status !== "hired" && (
                  <form action={withdrawApplicationAction}>
                    <input type="hidden" name="applicationId" value={r.id} />
                    <button
                      type="submit"
                      className="text-[10px] uppercase tracking-wider text-[var(--color-danger)] underline hover:no-underline"
                    >
                      Withdraw
                    </button>
                  </form>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-xs text-[var(--color-muted)]">
        Statuses are set by the employer. If you haven&apos;t heard back in a
        week, it&apos;s OK to send a polite follow-up via Messages.
      </p>
    </section>
  );
}
