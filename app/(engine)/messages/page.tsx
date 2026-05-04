import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  candidateProfiles,
  conversations,
  employerProfiles,
  jobs,
  messages,
} from "@/db/schema";
import { getSession } from "@/lib/auth/session";

export default async function InboxPage() {
  const session = await getSession();
  if (!session.userId) redirect("/sign-in");

  const db = getDb();
  const userId = session.userId!;

  // List all conversations the current user is part of, with the latest
  // message preview and an unread count from the *other* side.
  const rows = await db
    .select({
      id: conversations.id,
      jobId: conversations.jobId,
      employerId: conversations.employerId,
      candidateId: conversations.candidateId,
      lastMessageAt: conversations.lastMessageAt,
      archivedByEmployer: conversations.archivedByEmployer,
      archivedByCandidate: conversations.archivedByCandidate,
      jobTitle: jobs.title,
      jobCity: jobs.city,
      organizationName: employerProfiles.organizationName,
      candidateName: candidateProfiles.fullName,
      unreadCount: sql<number>`(
        select count(*)::int from ${messages}
        where ${messages.conversationId} = ${conversations.id}
          and ${messages.senderId} != ${userId}
          and ${messages.readAt} is null
      )`,
      lastBody: sql<string | null>`(
        select ${messages.body} from ${messages}
        where ${messages.conversationId} = ${conversations.id}
        order by ${messages.createdAt} desc
        limit 1
      )`,
    })
    .from(conversations)
    .leftJoin(jobs, eq(jobs.id, conversations.jobId))
    .leftJoin(
      employerProfiles,
      eq(employerProfiles.userId, conversations.employerId),
    )
    .leftJoin(
      candidateProfiles,
      eq(candidateProfiles.userId, conversations.candidateId),
    )
    .where(
      and(
        or(
          eq(conversations.employerId, userId),
          eq(conversations.candidateId, userId),
        )!,
      ),
    )
    .orderBy(desc(conversations.lastMessageAt))
    .limit(50);

  const visible = rows.filter((r) =>
    r.employerId === userId
      ? !r.archivedByEmployer
      : !r.archivedByCandidate,
  );

  return (
    <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold sm:text-3xl">Messages</h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Conversations with employers about your applications. We never share
        your phone number — if anyone asks for money to give you a job, leave
        the conversation and report the post.
      </p>

      <ul className="mt-6 space-y-2">
        {visible.length === 0 && (
          <li className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-6 text-sm text-[var(--color-muted)]">
            No conversations yet. When an employer wants to talk to you about
            an application, you&apos;ll see it here.
          </li>
        )}
        {visible.map((c) => {
          const otherName =
            c.employerId === userId
              ? c.candidateName ?? "Candidate"
              : c.organizationName ?? "Employer";
          return (
            <li key={c.id}>
              <Link
                href={`/messages/${c.id}`}
                className="flex items-start gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 hover:border-[var(--color-primary-strong)]"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold">{otherName}</p>
                    <p className="text-xs text-[var(--color-muted)]">
                      {new Date(c.lastMessageAt).toLocaleString()}
                    </p>
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                    {c.jobTitle ?? "Job"} · {c.jobCity ?? ""}
                  </p>
                  {c.lastBody && (
                    <p className="mt-1 line-clamp-1 text-sm">{c.lastBody}</p>
                  )}
                </div>
                {c.unreadCount > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center rounded-full bg-[var(--color-primary)] px-2 py-0.5 text-[10px] font-semibold text-white">
                    {c.unreadCount}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
