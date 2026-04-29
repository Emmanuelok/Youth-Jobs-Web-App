import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  applications,
  employerProfiles,
  jobs,
} from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { applyToJobAction, reportJobAction } from "./actions";

const inputCls =
  "mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary-strong)] focus:outline-none";

export default async function JobDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; flash?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const db = getDb();

  const [job] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  if (!job || job.status !== "published") notFound();

  const [employer] = await db
    .select()
    .from(employerProfiles)
    .where(eq(employerProfiles.userId, job.employerId))
    .limit(1);

  const session = await getSession();
  let alreadyApplied = false;
  if (session.userId) {
    const [app] = await db
      .select({ id: applications.id })
      .from(applications)
      .where(eq(applications.jobId, job.id))
      .limit(1);
    alreadyApplied = !!app;
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href="/jobs"
        className="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)]"
      >
        ← Back to all opportunities
      </Link>

      <header className="mt-3">
        <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
          {job.type}
        </span>
        <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">{job.title}</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          {employer?.organizationName ?? "Verified employer"} · {job.city},{" "}
          {job.region}
        </p>
        {employer?.verifiedAt && (
          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[var(--color-primary)]/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-primary-strong)]">
            ✓ Verified employer
          </span>
        )}
      </header>

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

      <div className="mt-6 flex flex-wrap gap-2 text-xs">
        {job.payAmountGhs ? (
          <span className="rounded-full bg-[var(--color-surface-2)] px-2 py-1">
            GHS {job.payAmountGhs.toLocaleString()} / {job.payPeriod}
          </span>
        ) : (
          <span className="rounded-full bg-[var(--color-surface-2)] px-2 py-1">
            {job.payPeriod === "unpaid_with_skills"
              ? "Unpaid · skills training"
              : "Pay on application"}
          </span>
        )}
        <span className="rounded-full bg-[var(--color-surface-2)] px-2 py-1">
          Min age {job.minimumAge}
        </span>
        {job.isHazardous && (
          <span className="rounded-full bg-[var(--color-danger)]/20 px-2 py-1 text-[var(--color-danger)]">
            Hazardous trade — 18+ only
          </span>
        )}
      </div>

      <article className="mt-6 whitespace-pre-line rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-sm leading-relaxed">
        {job.description}
      </article>

      <div className="mt-6 rounded-lg border border-[var(--color-accent)]/40 bg-[var(--color-surface)] p-4 text-xs text-[var(--color-muted)]">
        <p className="font-semibold text-[var(--color-accent)]">
          Stay safe when applying
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          <li>Never pay money to get a job or apprenticeship.</li>
          <li>Meet for the first interview in a public place during the day.</li>
          <li>Tell a trusted person where you are going and when you expect to return.</li>
          <li>If anything feels wrong, leave and report the post.</li>
        </ul>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <form action={applyToJobAction} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <input type="hidden" name="jobId" value={job.id} />
          <p className="text-sm font-semibold">Apply</p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            Free. Your profile and a short note are sent to the employer.
          </p>
          <label className="mt-3 block text-xs uppercase tracking-wider text-[var(--color-muted)]">
            Short message (optional)
          </label>
          <textarea
            name="message"
            rows={3}
            maxLength={600}
            placeholder="Why are you interested?"
            className={`${inputCls} resize-y`}
          />
          <button
            type="submit"
            disabled={alreadyApplied}
            className="mt-3 w-full rounded-md bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-primary-strong)] disabled:opacity-60"
          >
            {alreadyApplied ? "Application sent" : "Send application"}
          </button>
        </form>

        <form action={reportJobAction} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <input type="hidden" name="jobId" value={job.id} />
          <p className="text-sm font-semibold">Report this post</p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            See something off? Tell us — your report is anonymous to the
            employer.
          </p>
          <label className="mt-3 block text-xs uppercase tracking-wider text-[var(--color-muted)]">
            Reason
          </label>
          <select name="category" required defaultValue="" className={inputCls}>
            <option value="" disabled>Choose a reason</option>
            <option value="asks_for_money">Asks for money or fees</option>
            <option value="fake_company">Looks fake or unverifiable</option>
            <option value="unsafe">Unsafe workplace or task</option>
            <option value="discriminatory">Discriminatory wording</option>
            <option value="other">Other</option>
          </select>
          <label className="mt-3 block text-xs uppercase tracking-wider text-[var(--color-muted)]">
            Notes (optional)
          </label>
          <textarea
            name="notes"
            rows={2}
            maxLength={1000}
            className={`${inputCls} resize-y`}
          />
          <button
            type="submit"
            className="mt-3 w-full rounded-md border border-[var(--color-danger)] px-4 py-2.5 text-sm font-semibold text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
          >
            Send report
          </button>
        </form>
      </div>
    </section>
  );
}
