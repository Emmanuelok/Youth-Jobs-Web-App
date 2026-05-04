import { redirect } from "next/navigation";
import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  applications,
  employerProfiles,
  jobs,
} from "@/db/schema";
import { getSession } from "@/lib/auth/session";

export default async function EmployerDashboardPage() {
  const session = await getSession();
  if (!session.userId) redirect("/sign-in?intent=employer");
  if (session.role === "candidate") redirect("/jobs");

  const db = getDb();
  const [profile] = await db
    .select()
    .from(employerProfiles)
    .where(eq(employerProfiles.userId, session.userId!))
    .limit(1);
  if (!profile) redirect("/onboarding/employer");

  const myJobs = await db
    .select({
      id: jobs.id,
      title: jobs.title,
      type: jobs.type,
      status: jobs.status,
      city: jobs.city,
      region: jobs.region,
      createdAt: jobs.createdAt,
      applicantCount: sql<number>`(select count(*)::int from ${applications} where ${applications.jobId} = ${jobs.id})`,
    })
    .from(jobs)
    .where(eq(jobs.employerId, session.userId!))
    .orderBy(desc(jobs.createdAt));

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">
            {profile.organizationName}
          </h1>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            {profile.organizationType.replace("_", " ")} · {profile.city},{" "}
            {profile.region}
          </p>
          {profile.verifiedAt ? (
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[var(--color-primary)]/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-primary-strong)]">
              ✓ Verified
            </span>
          ) : (
            <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-[var(--color-accent)]/40 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-accent)]">
              Pending verification
            </span>
          )}
        </div>
        <Link
          href="/employer/jobs/new"
          className="rounded-md bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-primary-strong)]"
        >
          Post an opportunity
        </Link>
      </header>

      <h2 className="mt-10 text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">
        Your posts
      </h2>
      <ul className="mt-3 space-y-3">
        {myJobs.length === 0 && (
          <li className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-6 text-sm text-[var(--color-muted)]">
            No posts yet. Click &quot;Post an opportunity&quot; to add your
            first one.
          </li>
        )}
        {myJobs.map((j) => (
          <li
            key={j.id}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 hover:border-[var(--color-primary-strong)]"
          >
            <Link href={`/employer/jobs/${j.id}`} className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{j.title}</p>
                <p className="mt-1 text-xs text-[var(--color-muted)]">
                  {j.type} · {j.city}, {j.region}
                </p>
                <p className="mt-1 text-xs text-[var(--color-muted)]">
                  {j.applicantCount} applicant{j.applicantCount === 1 ? "" : "s"} · view
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                  j.status === "published"
                    ? "bg-[var(--color-primary)]/15 text-[var(--color-primary-strong)]"
                    : j.status === "rejected"
                      ? "bg-[var(--color-danger)]/15 text-[var(--color-danger)]"
                      : "border border-[var(--color-border)] text-[var(--color-muted)]"
                }`}
              >
                {j.status.replace("_", " ")}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
