import { redirect } from "next/navigation";
import { desc, eq, isNotNull, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  employerProfiles,
  jobs,
  messages,
  scamReports,
} from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import {
  publishJobAction,
  rejectEmployerAction,
  rejectJobAction,
  resolveScamReportAction,
  verifyEmployerAction,
} from "./actions";

export default async function AdminPage() {
  const session = await getSession();
  if (!session.userId || session.role !== "admin") {
    redirect("/");
  }

  const db = getDb();

  const pendingEmployers = await db
    .select()
    .from(employerProfiles)
    .where(isNull(employerProfiles.verifiedAt))
    .orderBy(desc(employerProfiles.createdAt))
    .limit(50);

  const pendingJobs = await db
    .select()
    .from(jobs)
    .where(eq(jobs.status, "pending_review"))
    .orderBy(desc(jobs.createdAt))
    .limit(50);

  const openReports = await db
    .select()
    .from(scamReports)
    .where(eq(scamReports.status, "open"))
    .orderBy(desc(scamReports.createdAt))
    .limit(50);

  const flaggedMessages = await db
    .select({
      id: messages.id,
      conversationId: messages.conversationId,
      body: messages.body,
      flagSeverity: messages.flagSeverity,
      flagReasons: messages.flagReasons,
      senderId: messages.senderId,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(isNotNull(messages.flagSeverity))
    .orderBy(desc(messages.createdAt))
    .limit(50);

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold sm:text-3xl">Admin console</h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Verify employers, publish or reject job posts, and resolve scam
        reports. Every action is recorded in <code>audit_logs</code>.
      </p>

      <h2 className="mt-10 text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">
        Employers awaiting verification ({pendingEmployers.length})
      </h2>
      <ul className="mt-3 space-y-3">
        {pendingEmployers.length === 0 && (
          <li className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 text-sm text-[var(--color-muted)]">
            No pending employers.
          </li>
        )}
        {pendingEmployers.map((e) => (
          <li
            key={e.userId}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4"
          >
            <p className="text-sm font-semibold">{e.organizationName}</p>
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              {e.organizationType.replace("_", " ")} · {e.city}, {e.region} ·
              contact {e.contactName}
            </p>
            {e.businessRegistrationNumber && (
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                Business reg #: {e.businessRegistrationNumber}
              </p>
            )}
            {e.ghanaCardLast4 && (
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                Ghana Card last 4: {e.ghanaCardLast4}
              </p>
            )}
            {e.description && (
              <p className="mt-2 text-sm">{e.description}</p>
            )}
            {e.rejectedReason && (
              <p className="mt-2 text-xs text-[var(--color-danger)]">
                Previously rejected: {e.rejectedReason}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <form action={verifyEmployerAction}>
                <input type="hidden" name="employerUserId" value={e.userId} />
                <button
                  type="submit"
                  className="rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-primary-strong)]"
                >
                  Verify
                </button>
              </form>
              <form
                action={rejectEmployerAction}
                className="flex flex-1 flex-wrap gap-2 sm:flex-nowrap"
              >
                <input type="hidden" name="employerUserId" value={e.userId} />
                <input
                  name="reason"
                  placeholder="Rejection reason"
                  className="flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1.5 text-xs placeholder:text-[var(--color-muted)]"
                />
                <button
                  type="submit"
                  className="rounded-md border border-[var(--color-danger)] px-3 py-1.5 text-xs font-semibold text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
                >
                  Reject
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>

      <h2 className="mt-10 text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">
        Jobs awaiting review ({pendingJobs.length})
      </h2>
      <ul className="mt-3 space-y-3">
        {pendingJobs.length === 0 && (
          <li className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 text-sm text-[var(--color-muted)]">
            No pending jobs.
          </li>
        )}
        {pendingJobs.map((j) => (
          <li
            key={j.id}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{j.title}</p>
                <p className="mt-1 text-xs text-[var(--color-muted)]">
                  {j.type} · {j.category} · {j.city}, {j.region}
                </p>
                <p className="mt-1 text-xs text-[var(--color-muted)]">
                  {j.payAmountGhs
                    ? `GHS ${j.payAmountGhs.toLocaleString()} / ${j.payPeriod}`
                    : `${j.payPeriod}`}{" "}
                  · min age {j.minimumAge}
                  {j.isHazardous && " · hazardous"}
                </p>
              </div>
            </div>
            <p className="mt-2 whitespace-pre-line text-sm">{j.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <form action={publishJobAction}>
                <input type="hidden" name="jobId" value={j.id} />
                <button
                  type="submit"
                  className="rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-primary-strong)]"
                >
                  Publish
                </button>
              </form>
              <form
                action={rejectJobAction}
                className="flex flex-1 flex-wrap gap-2 sm:flex-nowrap"
              >
                <input type="hidden" name="jobId" value={j.id} />
                <input
                  name="reason"
                  placeholder="Rejection reason"
                  className="flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1.5 text-xs placeholder:text-[var(--color-muted)]"
                />
                <button
                  type="submit"
                  className="rounded-md border border-[var(--color-danger)] px-3 py-1.5 text-xs font-semibold text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
                >
                  Reject
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>

      <h2 className="mt-10 text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">
        Flagged messages ({flaggedMessages.length})
      </h2>
      <ul className="mt-3 space-y-3">
        {flaggedMessages.length === 0 && (
          <li className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 text-sm text-[var(--color-muted)]">
            No flagged messages.
          </li>
        )}
        {flaggedMessages.map((m) => {
          const reasons = Array.isArray(m.flagReasons)
            ? (m.flagReasons as string[])
            : [];
          return (
            <li
              key={m.id}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
            >
              <p className="text-xs uppercase tracking-wider text-[var(--color-danger)]">
                {m.flagSeverity} · {reasons.join(", ")}
              </p>
              <p className="mt-2 whitespace-pre-line text-sm">{m.body}</p>
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                Conversation {m.conversationId} · sender {m.senderId} ·{" "}
                {new Date(m.createdAt).toLocaleString()}
              </p>
            </li>
          );
        })}
      </ul>

      <h2 className="mt-10 text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">
        Open scam / safety reports ({openReports.length})
      </h2>
      <ul className="mt-3 space-y-3">
        {openReports.length === 0 && (
          <li className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 text-sm text-[var(--color-muted)]">
            No open reports.
          </li>
        )}
        {openReports.map((r) => (
          <li
            key={r.id}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4"
          >
            <p className="text-sm font-semibold">
              {r.category.replace("_", " ")}
            </p>
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              Job {r.jobId} · reporter {r.reporterId ?? "anonymous"} ·{" "}
              {new Date(r.createdAt).toLocaleString()}
            </p>
            {r.notes && <p className="mt-2 text-sm">{r.notes}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <form action={resolveScamReportAction}>
                <input type="hidden" name="reportId" value={r.id} />
                <input type="hidden" name="decision" value="actioned" />
                <button
                  type="submit"
                  className="rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-primary-strong)]"
                >
                  Mark actioned
                </button>
              </form>
              <form action={resolveScamReportAction}>
                <input type="hidden" name="reportId" value={r.id} />
                <input type="hidden" name="decision" value="dismissed" />
                <button
                  type="submit"
                  className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-muted)] hover:text-[var(--color-text)]"
                >
                  Dismiss
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
