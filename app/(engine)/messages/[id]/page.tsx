import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  candidateProfiles,
  conversations,
  employerProfiles,
  jobs,
  messages,
} from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import {
  archiveConversationAction,
  markConversationRead,
  sendReplyAction,
} from "../actions";

const inputCls =
  "mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary-strong)] focus:outline-none";

export default async function ThreadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const session = await getSession();
  if (!session.userId) redirect("/sign-in");

  const db = getDb();
  const userId = session.userId!;

  const [convo] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id))
    .limit(1);
  if (!convo) notFound();

  const isEmployer = convo.employerId === userId;
  const isCandidate = convo.candidateId === userId;
  if (!isEmployer && !isCandidate && session.role !== "admin") notFound();

  // Mark unread incoming messages as read on view.
  await markConversationRead(id);

  const [job] = await db.select().from(jobs).where(eq(jobs.id, convo.jobId));
  const [employer] = await db
    .select()
    .from(employerProfiles)
    .where(eq(employerProfiles.userId, convo.employerId));
  const [candidate] = await db
    .select()
    .from(candidateProfiles)
    .where(eq(candidateProfiles.userId, convo.candidateId));

  const thread = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, convo.id))
    .orderBy(asc(messages.createdAt));

  const otherPartyName = isEmployer
    ? candidate?.fullName ?? "Candidate"
    : employer?.organizationName ?? "Employer";

  return (
    <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href="/messages"
        className="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)]"
      >
        ← Back to messages
      </Link>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">
            {otherPartyName}
          </h1>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            About: <Link href={`/jobs/${convo.jobId}`} className="underline hover:text-[var(--color-text)]">{job?.title ?? "this job"}</Link>
            {job?.city && <> · {job.city}</>}
          </p>
          {employer?.verifiedAt && (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[var(--color-primary)]/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-primary-strong)]">
              ✓ Verified employer
            </span>
          )}
        </div>
        <form action={archiveConversationAction}>
          <input type="hidden" name="conversationId" value={convo.id} />
          <button
            type="submit"
            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs hover:border-[var(--color-danger)] hover:text-[var(--color-danger)]"
          >
            Archive
          </button>
        </form>
      </header>

      <div className="mt-4 rounded-md border border-[var(--color-accent)]/40 bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-muted)]">
        <strong className="text-[var(--color-accent)]">Stay safe:</strong>{" "}
        Never send money or share OTP codes. Meet first interviews in a public
        place during the day. Tell a trusted person where you are going.
      </div>

      {sp.error && (
        <div className="mt-4 rounded-md border border-[var(--color-danger)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-danger)]">
          {sp.error}
        </div>
      )}

      <ol className="mt-6 space-y-3">
        {thread.length === 0 && (
          <li className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-sm text-[var(--color-muted)]">
            No messages yet.
          </li>
        )}
        {thread.map((m) => {
          const mine = m.senderId === userId;
          const flagged = m.flagSeverity === "medium" && !mine;
          const reasons = Array.isArray(m.flagReasons)
            ? (m.flagReasons as string[])
            : [];
          return (
            <li
              key={m.id}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  mine
                    ? "bg-[var(--color-primary)] text-white"
                    : flagged
                      ? "border border-[var(--color-danger)] bg-[var(--color-surface)]"
                      : "border border-[var(--color-border)] bg-[var(--color-surface)]"
                }`}
              >
                {flagged && (
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-danger)]">
                    ⚠ Caution: {reasons.join(", ")}. Never send money or share
                    OTP codes.
                  </p>
                )}
                <p className="whitespace-pre-line">{m.body}</p>
                <p
                  className={`mt-1 text-[10px] ${
                    mine ? "text-white/70" : "text-[var(--color-muted)]"
                  }`}
                >
                  {new Date(m.createdAt).toLocaleString()}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      <form
        action={sendReplyAction}
        className="mt-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
      >
        <input type="hidden" name="conversationId" value={convo.id} />
        <label htmlFor="body" className="sr-only">
          Reply
        </label>
        <textarea
          id="body"
          name="body"
          rows={3}
          maxLength={2000}
          required
          placeholder="Write a reply…"
          className={`${inputCls} resize-y`}
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-[10px] text-[var(--color-muted)]">
            Don&apos;t share OTP codes or send money to anyone here.
          </p>
          <button
            type="submit"
            className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-primary-strong)]"
          >
            Send
          </button>
        </div>
      </form>
    </section>
  );
}
