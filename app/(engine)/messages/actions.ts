"use server";

import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  applications,
  conversations,
  jobs,
  messages,
} from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { messageBodySchema } from "@/lib/validation";
import { str, withError } from "@/lib/forms";

/**
 * Employer (or admin) starts a conversation with a candidate who has
 * applied to one of their jobs. We never let either party initiate
 * messages outside the application context.
 */
export async function startConversationAction(formData: FormData) {
  const session = await getSession();
  if (!session.userId) redirect("/sign-in?intent=employer");
  if (session.role === "candidate") {
    redirect(withError("/", "Only employers can start conversations."));
  }

  const jobId = str(formData, "jobId");
  const candidateId = str(formData, "candidateId");
  const initialBody = str(formData, "body");

  if (!jobId || !candidateId) redirect("/employer");

  const parsed = messageBodySchema.safeParse(initialBody);
  if (!parsed.success) {
    redirect(
      withError(
        `/employer/jobs/${jobId}`,
        parsed.error.issues[0]?.message ?? "Type a message before sending.",
      ),
    );
  }

  const db = getDb();

  // Job must exist and belong to this employer (or admin can DM any).
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (!job) redirect("/employer");
  if (session.role !== "admin" && job.employerId !== session.userId) {
    redirect(withError("/employer", "You don't own this job post."));
  }

  // Candidate must have an application for this job.
  const [app] = await db
    .select({ id: applications.id })
    .from(applications)
    .where(
      and(
        eq(applications.jobId, jobId),
        eq(applications.candidateId, candidateId),
      ),
    )
    .limit(1);
  if (!app) {
    redirect(
      withError(
        `/employer/jobs/${jobId}`,
        "That candidate hasn't applied to this job.",
      ),
    );
  }

  // Upsert conversation (one thread per job × employer × candidate).
  const employerId = job.employerId;
  const [convo] = await db
    .insert(conversations)
    .values({ jobId, employerId, candidateId, lastMessageAt: new Date() })
    .onConflictDoUpdate({
      target: [
        conversations.jobId,
        conversations.employerId,
        conversations.candidateId,
      ],
      set: { lastMessageAt: new Date(), archivedByEmployer: false },
    })
    .returning();

  await db.insert(messages).values({
    conversationId: convo.id,
    senderId: session.userId!,
    body: parsed.data,
  });

  redirect(`/messages/${convo.id}`);
}

export async function sendReplyAction(formData: FormData) {
  const session = await getSession();
  if (!session.userId) redirect("/sign-in");

  const conversationId = str(formData, "conversationId");
  const body = str(formData, "body");

  const parsed = messageBodySchema.safeParse(body);
  if (!parsed.success) {
    redirect(
      withError(
        `/messages/${conversationId}`,
        parsed.error.issues[0]?.message ?? "Type a message before sending.",
      ),
    );
  }

  const db = getDb();

  const [convo] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);

  if (
    !convo ||
    (convo.employerId !== session.userId &&
      convo.candidateId !== session.userId &&
      session.role !== "admin")
  ) {
    redirect(withError("/messages", "Conversation not found."));
  }

  const now = new Date();
  await db.insert(messages).values({
    conversationId: convo.id,
    senderId: session.userId!,
    body: parsed.data,
  });
  await db
    .update(conversations)
    .set({
      lastMessageAt: now,
      // Sending un-archives the thread for the sender's side.
      archivedByEmployer:
        session.userId === convo.employerId ? false : convo.archivedByEmployer,
      archivedByCandidate:
        session.userId === convo.candidateId
          ? false
          : convo.archivedByCandidate,
    })
    .where(eq(conversations.id, convo.id));

  redirect(`/messages/${convo.id}`);
}

/**
 * Mark all unread messages in a conversation that were sent by the *other*
 * party as read for the current user. Called from the thread page on view.
 */
export async function markConversationRead(
  conversationId: string,
): Promise<void> {
  const session = await getSession();
  if (!session.userId) return;

  const db = getDb();
  await db
    .update(messages)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(messages.conversationId, conversationId),
        sql`${messages.senderId} != ${session.userId}`,
        sql`${messages.readAt} is null`,
      ),
    );
}

/**
 * Count unread messages addressed to the current user across all their
 * conversations. Used by the header badge.
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(messages)
    .innerJoin(
      conversations,
      eq(conversations.id, messages.conversationId),
    )
    .where(
      and(
        sql`${messages.senderId} != ${userId}`,
        sql`${messages.readAt} is null`,
        sql`(${conversations.employerId} = ${userId} or ${conversations.candidateId} = ${userId})`,
      ),
    );
  return row?.count ?? 0;
}

export async function archiveConversationAction(formData: FormData) {
  const session = await getSession();
  if (!session.userId) redirect("/sign-in");
  const conversationId = str(formData, "conversationId");
  if (!conversationId) redirect("/messages");

  const db = getDb();
  const [convo] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);
  if (!convo) redirect("/messages");

  const isEmployer = convo.employerId === session.userId;
  const isCandidate = convo.candidateId === session.userId;
  if (!isEmployer && !isCandidate && session.role !== "admin") {
    redirect("/messages");
  }

  await db
    .update(conversations)
    .set(
      isEmployer
        ? { archivedByEmployer: true }
        : { archivedByCandidate: true },
    )
    .where(eq(conversations.id, conversationId));

  redirect("/messages");
}
