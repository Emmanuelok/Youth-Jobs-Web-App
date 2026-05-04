import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { guardianConsents } from "@/db/schema";

/**
 * Returns the most recent guardian consent row for a candidate, or null.
 * Excludes revoked rows.
 */
export async function latestConsent(candidateId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(guardianConsents)
    .where(
      and(
        eq(guardianConsents.candidateId, candidateId),
        isNull(guardianConsents.revokedAt),
      ),
    )
    .orderBy(desc(guardianConsents.requestedAt))
    .limit(1);
  return row ?? null;
}

export async function hasApprovedConsent(candidateId: string): Promise<boolean> {
  const row = await latestConsent(candidateId);
  if (!row) return false;
  if (row.decision !== "approved") return false;
  if (row.revokedAt) return false;
  return true;
}
