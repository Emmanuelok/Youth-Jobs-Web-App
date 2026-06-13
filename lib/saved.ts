import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { savedOpportunities } from "@/db/schema";

/**
 * Which of the given jobIds the candidate has saved. One query for a whole
 * list page (avoids N+1). Returns a Set for O(1) membership checks.
 */
export async function getSavedJobIdSet(
  candidateId: string,
  jobIds: string[],
): Promise<Set<string>> {
  if (jobIds.length === 0) return new Set();
  const db = getDb();
  const rows = await db
    .select({ jobId: savedOpportunities.jobId })
    .from(savedOpportunities)
    .where(
      and(
        eq(savedOpportunities.candidateId, candidateId),
        inArray(savedOpportunities.jobId, jobIds),
      ),
    );
  return new Set(rows.map((r) => r.jobId));
}

export async function isJobSaved(
  candidateId: string,
  jobId: string,
): Promise<boolean> {
  const set = await getSavedJobIdSet(candidateId, [jobId]);
  return set.has(jobId);
}
