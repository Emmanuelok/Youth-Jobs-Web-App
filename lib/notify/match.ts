import { HAZARDOUS_CATEGORIES_DEFAULT } from "@/lib/ghana";

/**
 * Matching V0 — deliberately simple and explainable.
 *
 * Hard gates (job is excluded if any fail):
 *   - Candidate's age < job.minimumAge
 *   - job.isHazardous AND candidate.isUnder18
 *
 * Score (higher = better):
 *   +3  city match
 *   +1  region match (when not city)
 *   +2  per overlapping skill keyword (case-insensitive token match
 *       against the job's title + category + description)
 *   +1  freshness bonus if published within last 24h
 *
 * No machine learning. No collaborative filtering. We can layer those on
 * once we have enough placements to learn from.
 */

export type MatchableCandidate = {
  city: string;
  region: string;
  yearOfBirth: number;
  isUnder18: boolean;
  skills: string[];
  /** Slugs from skills_taxonomy that the candidate holds a verified badge in. */
  badgeSlugs?: string[];
};

export type MatchableJob = {
  id: string;
  title: string;
  type: string;
  category: string;
  city: string;
  region: string;
  description: string;
  payAmountGhs: number | null;
  payPeriod: string;
  minimumAge: number;
  isHazardous: boolean;
  publishedAt: Date | null;
};

export type ScoredJob = {
  job: MatchableJob;
  score: number;
  reasons: string[];
};

export function scoreJobsForCandidate(
  candidate: MatchableCandidate,
  jobs: MatchableJob[],
  now: Date = new Date(),
): ScoredJob[] {
  const candidateAge = now.getFullYear() - candidate.yearOfBirth;
  const candidateSkillTokens = new Set(
    candidate.skills.flatMap((s) => tokenize(s)),
  );

  const results: ScoredJob[] = [];

  for (const job of jobs) {
    // Hard gates.
    if (candidateAge < job.minimumAge) continue;
    if (
      candidate.isUnder18 &&
      (job.isHazardous || HAZARDOUS_CATEGORIES_DEFAULT.has(job.category))
    ) {
      continue;
    }

    let score = 0;
    const reasons: string[] = [];

    if (sameCity(candidate.city, job.city)) {
      score += 3;
      reasons.push(`In ${job.city}`);
    } else if (sameRegion(candidate.region, job.region)) {
      score += 1;
      reasons.push(`In ${job.region}`);
    }

    const jobTokens = new Set([
      ...tokenize(job.title),
      ...tokenize(job.category),
      ...tokenize(job.description),
    ]);
    const overlap: string[] = [];
    for (const skill of candidate.skills) {
      const skillTokens = tokenize(skill);
      if (skillTokens.some((t) => jobTokens.has(t))) {
        overlap.push(skill);
      }
    }
    if (overlap.length > 0) {
      score += overlap.length * 2;
      reasons.push(`Matches: ${overlap.slice(0, 3).join(", ")}`);
    }

    if (
      job.publishedAt &&
      now.getTime() - job.publishedAt.getTime() < 24 * 60 * 60 * 1000
    ) {
      score += 1;
      reasons.push("Posted today");
    }

    // Verified badge boost: each badge whose slug-as-tokens appears in the
    // job's text adds +4. Worth more than a self-reported skill match
    // (+2) because the badge is independently graded.
    if (candidate.badgeSlugs && candidate.badgeSlugs.length > 0) {
      const matchedBadges: string[] = [];
      for (const slug of candidate.badgeSlugs) {
        const slugTokens = tokenize(slug.replace(/_/g, " "));
        if (slugTokens.some((tok) => jobTokens.has(tok))) {
          matchedBadges.push(slug);
        }
      }
      if (matchedBadges.length > 0) {
        score += matchedBadges.length * 4;
        reasons.push(`Verified: ${matchedBadges.slice(0, 2).join(", ")}`);
      }
    }

    if (score === 0) continue;

    // Mild floor: don't rank a tiny location-only match above a strong skill match.
    void candidateSkillTokens; // reserved for future weighting

    results.push({ job, score, reasons });
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const bp = b.job.publishedAt?.getTime() ?? 0;
    const ap = a.job.publishedAt?.getTime() ?? 0;
    return bp - ap;
  });
  return results;
}

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOP_WORDS.has(t));
}

const STOP_WORDS = new Set([
  "and",
  "the",
  "for",
  "with",
  "from",
  "into",
  "about",
  "this",
  "that",
  "have",
  "must",
  "will",
  "your",
  "are",
  "was",
  "were",
]);

function sameCity(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}
function sameRegion(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}
