import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  applications,
  candidateProfiles,
  jobs,
} from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { newIdempotencyKey } from "@/lib/idempotency";
import { getActiveBadgeSlugsByCandidate } from "@/lib/assessments/queries";
import { listSkills } from "@/lib/assessments/queries";
import { getTranslations } from "@/lib/i18n";
import { startConversationAction } from "../../../messages/actions";
import { proposeInterviewAction } from "@/app/(engine)/interviews/actions";
import { closeJobAction, setApplicationStatusAction } from "./actions";

const inputCls =
  "mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary-strong)] focus:outline-none";

export default async function EmployerJobDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const session = await getSession();
  if (!session.userId) redirect("/sign-in?intent=employer");

  const db = getDb();
  const [job] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  if (!job) notFound();
  if (session.role !== "admin" && job.employerId !== session.userId) {
    redirect("/employer");
  }

  const applicants = await db
    .select({
      id: applications.id,
      status: applications.status,
      message: applications.message,
      createdAt: applications.createdAt,
      candidateId: applications.candidateId,
      fullName: candidateProfiles.fullName,
      city: candidateProfiles.city,
      region: candidateProfiles.region,
      educationLevel: candidateProfiles.educationLevel,
      skills: candidateProfiles.skills,
      languages: candidateProfiles.languages,
      availability: candidateProfiles.availability,
      yearOfBirth: candidateProfiles.yearOfBirth,
    })
    .from(applications)
    .innerJoin(
      candidateProfiles,
      eq(candidateProfiles.userId, applications.candidateId),
    )
    .where(eq(applications.jobId, id))
    .orderBy(desc(applications.createdAt));

  // Batched fetch of badges for every applicant on this page (no N+1).
  const badgeMap = await getActiveBadgeSlugsByCandidate(
    applicants.map((a) => a.candidateId),
  );
  const allSkills = await listSkills();
  const skillNameBySlug = new Map(allSkills.map((s) => [s.slug, s.name]));
  const { t } = await getTranslations();

  // Default the proposed time to "tomorrow at 10am" in the user's locale.
  const defaultProposedAt = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    // Format for <input type="datetime-local">: YYYY-MM-DDTHH:MM
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  })();

  return (
    <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link
        href="/employer"
        className="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)]"
      >
        ← Back to dashboard
      </Link>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">{job.title}</h1>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            {job.type} · {job.city}, {job.region} · status {job.status.replace("_", " ")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {job.status !== "closed" && (
            <Link
              href={`/employer/jobs/${job.id}/edit`}
              className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs hover:border-[var(--color-primary-strong)]"
            >
              Edit post
            </Link>
          )}
          {job.status === "published" && (
            <form action={closeJobAction}>
              <input type="hidden" name="jobId" value={job.id} />
              <button
                type="submit"
                className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs hover:border-[var(--color-danger)] hover:text-[var(--color-danger)]"
              >
                Close this post
              </button>
            </form>
          )}
        </div>
      </header>

      {sp.error && (
        <div className="mt-4 rounded-md border border-[var(--color-danger)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-danger)]">
          {sp.error}
        </div>
      )}

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">
        Applicants ({applicants.length})
      </h2>

      <ul className="mt-3 space-y-3">
        {applicants.length === 0 && (
          <li className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 text-sm text-[var(--color-muted)]">
            No applicants yet.
          </li>
        )}
        {applicants.map((a) => {
          const age = new Date().getFullYear() - a.yearOfBirth;
          return (
            <li
              key={a.id}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{a.fullName}</p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">
                    {a.city}, {a.region} · age {age} · {a.educationLevel} ·
                    {" "}available {a.availability.replace("_", " ")}
                  </p>
                  {a.skills.length > 0 && (
                    <p className="mt-1 text-xs">
                      Skills: {a.skills.join(", ")}
                    </p>
                  )}
                  {a.languages.length > 0 && (
                    <p className="text-xs text-[var(--color-muted)]">
                      Languages: {a.languages.join(", ")}
                    </p>
                  )}
                  {(badgeMap.get(a.candidateId)?.length ?? 0) > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-1">
                      {badgeMap.get(a.candidateId)!.map((slug) => (
                        <li
                          key={slug}
                          className="inline-flex items-center rounded-full border border-[var(--color-primary-strong)] bg-[var(--color-surface-2)] px-2 py-0.5 text-[10px] text-[var(--color-primary-strong)]"
                        >
                          ✓ {skillNameBySlug.get(slug) ?? slug}
                        </li>
                      ))}
                    </ul>
                  )}
                  {a.message && (
                    <p className="mt-2 whitespace-pre-line rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm">
                      {a.message}
                    </p>
                  )}
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                    a.status === "hired"
                      ? "bg-[var(--color-primary)]/15 text-[var(--color-primary-strong)]"
                      : a.status === "rejected"
                        ? "bg-[var(--color-danger)]/15 text-[var(--color-danger)]"
                        : "border border-[var(--color-border)] text-[var(--color-muted)]"
                  }`}
                >
                  {a.status}
                </span>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <form
                  action={startConversationAction}
                  className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3"
                >
                  <input type="hidden" name="jobId" value={job.id} />
                  <input type="hidden" name="candidateId" value={a.candidateId} />
                  <input type="hidden" name="idemKey" value={newIdempotencyKey()} />
                  <label className="block text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
                    Send a message
                  </label>
                  <textarea
                    name="body"
                    rows={2}
                    maxLength={2000}
                    required
                    placeholder="Hi, thanks for applying. Are you free for a short interview…"
                    className={`${inputCls} resize-y`}
                  />
                  <button
                    type="submit"
                    className="mt-2 rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-primary-strong)]"
                  >
                    Send & open thread
                  </button>
                </form>

                <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
                  <p className="text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
                    Update status
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(["shortlisted", "rejected", "hired"] as const).map(
                      (s) => (
                        <form key={s} action={setApplicationStatusAction}>
                          <input
                            type="hidden"
                            name="applicationId"
                            value={a.id}
                          />
                          <input type="hidden" name="jobId" value={job.id} />
                          <input type="hidden" name="status" value={s} />
                          <button
                            type="submit"
                            disabled={a.status === s}
                            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs hover:border-[var(--color-primary-strong)] disabled:opacity-50"
                          >
                            {s === "shortlisted"
                              ? "Shortlist"
                              : s === "rejected"
                                ? "Reject"
                                : "Mark hired"}
                          </button>
                        </form>
                      ),
                    )}
                  </div>
                </div>
              </div>

              <details className="mt-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
                <summary className="cursor-pointer text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
                  {t.interview.proposeTitle}
                </summary>
                <form
                  action={proposeInterviewAction}
                  className="mt-3 space-y-3"
                >
                  <input type="hidden" name="jobId" value={job.id} />
                  <input type="hidden" name="candidateId" value={a.candidateId} />
                  <input type="hidden" name="applicationId" value={a.id} />
                  <input type="hidden" name="idemKey" value={newIdempotencyKey()} />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-xs">
                      <span className="text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
                        {t.interview.when}
                      </span>
                      <input
                        type="datetime-local"
                        name="scheduledAt"
                        required
                        defaultValue={defaultProposedAt}
                        className={inputCls}
                      />
                    </label>
                    <label className="block text-xs">
                      <span className="text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
                        {t.interview.duration}
                      </span>
                      <input
                        type="number"
                        name="durationMinutes"
                        min={5}
                        max={180}
                        defaultValue={30}
                        required
                        className={inputCls}
                      />
                    </label>
                  </div>
                  <label className="block text-xs">
                    <span className="text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
                      {t.interview.mode}
                    </span>
                    <select
                      name="mode"
                      required
                      defaultValue=""
                      className={inputCls}
                    >
                      <option value="" disabled>
                        Choose
                      </option>
                      <option value="in_person">{t.interview.modeInPerson}</option>
                      <option value="phone">{t.interview.modePhone}</option>
                      <option value="video">{t.interview.modeVideo}</option>
                    </select>
                  </label>
                  <label className="block text-xs">
                    <span className="text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
                      {t.interview.locationLabel}
                    </span>
                    <input
                      name="locationOrLink"
                      maxLength={500}
                      placeholder="e.g. Adum branch, near Kejetia; or paste a video link"
                      className={inputCls}
                    />
                  </label>
                  <label className="block text-xs">
                    <span className="text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
                      {t.interview.notesLabel}
                    </span>
                    <textarea
                      name="notes"
                      rows={2}
                      maxLength={1000}
                      className={`${inputCls} resize-y`}
                    />
                  </label>
                  <button
                    type="submit"
                    className="rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-primary-strong)]"
                  >
                    {t.interview.submit}
                  </button>
                </form>
              </details>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
