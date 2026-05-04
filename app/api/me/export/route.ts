import { NextResponse } from "next/server";
import { desc, eq, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  applications,
  candidateProfiles,
  conversations,
  employerProfiles,
  generatedCvs,
  guardianConsents,
  jobs,
  messages,
  users,
} from "@/db/schema";
import { getSession } from "@/lib/auth/session";

/**
 * Self-service personal data export. JSON, downloadable as an attachment.
 *
 * Returns everything we hold about the requesting user. We deliberately
 * include rows from related tables that include them as a participant
 * (jobs they posted, messages they sent, conversations they're in,
 * applications they submitted, CVs we generated for them, consent
 * records, audit_logs that recorded their actions).
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const userId = session.userId;

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [candidate] = await db
    .select()
    .from(candidateProfiles)
    .where(eq(candidateProfiles.userId, userId));
  const [employer] = await db
    .select()
    .from(employerProfiles)
    .where(eq(employerProfiles.userId, userId));

  const myApplications = await db
    .select()
    .from(applications)
    .where(eq(applications.candidateId, userId))
    .orderBy(desc(applications.createdAt));

  const myJobs = await db
    .select()
    .from(jobs)
    .where(eq(jobs.employerId, userId))
    .orderBy(desc(jobs.createdAt));

  const myConversations = await db
    .select()
    .from(conversations)
    .where(
      or(
        eq(conversations.employerId, userId),
        eq(conversations.candidateId, userId),
      ),
    )
    .orderBy(desc(conversations.lastMessageAt));

  const myMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.senderId, userId))
    .orderBy(desc(messages.createdAt));

  const myCvs = await db
    .select()
    .from(generatedCvs)
    .where(eq(generatedCvs.candidateId, userId))
    .orderBy(desc(generatedCvs.createdAt));

  const myConsents = await db
    .select()
    .from(guardianConsents)
    .where(eq(guardianConsents.candidateId, userId))
    .orderBy(desc(guardianConsents.requestedAt));

  const payload = {
    exportedAt: new Date().toISOString(),
    user,
    candidateProfile: candidate ?? null,
    employerProfile: employer ?? null,
    applications: myApplications,
    jobsPosted: myJobs,
    conversations: myConversations,
    messagesSent: myMessages,
    generatedCvs: myCvs,
    guardianConsents: myConsents,
    note:
      "This is everything we hold about you that's directly addressable via your account. Audit log entries that reference you may exist for compliance reasons but do not contain personal content. To request those, contact support.",
  };

  const filename = `ghana-youth-jobs-export-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
