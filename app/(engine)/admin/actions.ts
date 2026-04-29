"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  auditLogs,
  employerProfiles,
  jobs,
  scamReports,
} from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { str } from "@/lib/forms";

async function requireAdmin() {
  const session = await getSession();
  if (!session.userId || session.role !== "admin") {
    redirect("/");
  }
  return session.userId!;
}

export async function verifyEmployerAction(formData: FormData) {
  const adminId = await requireAdmin();
  const employerUserId = str(formData, "employerUserId");
  if (!employerUserId) redirect("/admin");

  const db = getDb();
  await db
    .update(employerProfiles)
    .set({
      verifiedAt: new Date(),
      verifiedBy: adminId,
      rejectedReason: null,
      updatedAt: new Date(),
    })
    .where(eq(employerProfiles.userId, employerUserId));

  await db.insert(auditLogs).values({
    actorId: adminId,
    action: "employer.verify",
    entityType: "employer_profile",
    entityId: employerUserId,
  });

  redirect("/admin");
}

export async function rejectEmployerAction(formData: FormData) {
  const adminId = await requireAdmin();
  const employerUserId = str(formData, "employerUserId");
  const reason = str(formData, "reason").slice(0, 400) || "rejected";
  if (!employerUserId) redirect("/admin");

  const db = getDb();
  await db
    .update(employerProfiles)
    .set({
      verifiedAt: null,
      verifiedBy: null,
      rejectedReason: reason,
      updatedAt: new Date(),
    })
    .where(eq(employerProfiles.userId, employerUserId));

  await db.insert(auditLogs).values({
    actorId: adminId,
    action: "employer.reject",
    entityType: "employer_profile",
    entityId: employerUserId,
    metadata: { reason },
  });

  redirect("/admin");
}

export async function publishJobAction(formData: FormData) {
  const adminId = await requireAdmin();
  const jobId = str(formData, "jobId");
  if (!jobId) redirect("/admin");

  const db = getDb();
  await db
    .update(jobs)
    .set({
      status: "published",
      publishedAt: new Date(),
      rejectedReason: null,
      updatedAt: new Date(),
    })
    .where(eq(jobs.id, jobId));

  await db.insert(auditLogs).values({
    actorId: adminId,
    action: "job.publish",
    entityType: "job",
    entityId: jobId,
  });

  redirect("/admin");
}

export async function rejectJobAction(formData: FormData) {
  const adminId = await requireAdmin();
  const jobId = str(formData, "jobId");
  const reason = str(formData, "reason").slice(0, 400) || "rejected";
  if (!jobId) redirect("/admin");

  const db = getDb();
  await db
    .update(jobs)
    .set({
      status: "rejected",
      rejectedReason: reason,
      updatedAt: new Date(),
    })
    .where(eq(jobs.id, jobId));

  await db.insert(auditLogs).values({
    actorId: adminId,
    action: "job.reject",
    entityType: "job",
    entityId: jobId,
    metadata: { reason },
  });

  redirect("/admin");
}

export async function resolveScamReportAction(formData: FormData) {
  const adminId = await requireAdmin();
  const reportId = str(formData, "reportId");
  const decision = str(formData, "decision"); // 'actioned' | 'dismissed'
  if (!reportId) redirect("/admin");

  const db = getDb();
  await db
    .update(scamReports)
    .set({
      status: decision === "actioned" ? "actioned" : "dismissed",
      resolvedAt: new Date(),
      resolvedBy: adminId,
    })
    .where(eq(scamReports.id, reportId));

  await db.insert(auditLogs).values({
    actorId: adminId,
    action: `scam_report.${decision === "actioned" ? "action" : "dismiss"}`,
    entityType: "scam_report",
    entityId: reportId,
  });

  redirect("/admin");
}
