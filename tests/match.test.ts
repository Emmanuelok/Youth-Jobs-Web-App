import { describe, it, expect } from "vitest";
import {
  scoreJobsForCandidate,
  type MatchableCandidate,
  type MatchableJob,
} from "@/lib/notify/match";

const NOW = new Date("2026-05-15T10:00:00Z");

function job(overrides: Partial<MatchableJob> = {}): MatchableJob {
  return {
    id: "job_1",
    title: "Junior tailor",
    type: "job",
    category: "Tailoring & garment making",
    city: "Kumasi",
    region: "Ashanti",
    description: "Sewing and cutting work",
    payAmountGhs: 800,
    payPeriod: "month",
    minimumAge: 18,
    isHazardous: false,
    publishedAt: new Date("2026-05-14T10:00:00Z"),
    ...overrides,
  };
}

function candidate(
  overrides: Partial<MatchableCandidate> = {},
): MatchableCandidate {
  return {
    city: "Kumasi",
    region: "Ashanti",
    yearOfBirth: 2002, // age 24 in 2026
    isUnder18: false,
    skills: ["tailoring", "customer care"],
    ...overrides,
  };
}

describe("scoreJobsForCandidate — hard gates", () => {
  it("excludes jobs whose minimumAge is above the candidate's age", () => {
    const c = candidate({ yearOfBirth: 2014 }); // age 12
    const j = job({ minimumAge: 18 });
    expect(scoreJobsForCandidate(c, [j], NOW)).toEqual([]);
  });

  it("excludes hazardous jobs for under-18s even with otherwise matching skills", () => {
    const c = candidate({ yearOfBirth: 2010, isUnder18: true }); // 16
    const j = job({
      minimumAge: 15,
      isHazardous: true,
      category: "Welding & metal fabrication",
      title: "Welder apprentice",
    });
    expect(scoreJobsForCandidate(c, [j], NOW)).toEqual([]);
  });

  it("excludes implicitly-hazardous categories for under-18s when isHazardous is false", () => {
    const c = candidate({ yearOfBirth: 2010, isUnder18: true });
    const j = job({
      minimumAge: 15,
      isHazardous: false,
      category: "Construction",
      title: "Site helper",
    });
    expect(scoreJobsForCandidate(c, [j], NOW)).toEqual([]);
  });

  it("allows hazardous jobs for adults", () => {
    const c = candidate({ yearOfBirth: 1995, isUnder18: false });
    const j = job({ isHazardous: true, category: "Welding & metal fabrication" });
    const scored = scoreJobsForCandidate(c, [j], NOW);
    expect(scored.length).toBe(1);
  });
});

describe("scoreJobsForCandidate — scoring", () => {
  it("scores a city match (+3) higher than a region-only match (+1)", () => {
    const c = candidate({ city: "Kumasi", region: "Ashanti", skills: [] });
    const cityJob = job({ id: "city", city: "Kumasi", region: "Ashanti" });
    const regionJob = job({ id: "region", city: "Obuasi", region: "Ashanti" });
    const scored = scoreJobsForCandidate(c, [regionJob, cityJob], NOW);
    expect(scored[0]!.job.id).toBe("city");
    expect(scored[1]!.job.id).toBe("region");
  });

  it("awards +2 per overlapping skill keyword between candidate skills and job text", () => {
    const c = candidate({
      city: "Accra",
      region: "Greater Accra",
      skills: ["tailoring"],
    });
    const j = job({
      city: "Accra",
      region: "Greater Accra",
      title: "Tailoring assistant",
    });
    const scored = scoreJobsForCandidate(c, [j], NOW);
    // city(3) + skill(2) + freshness(?) — published 24h ago so no freshness bonus
    expect(scored[0]!.score).toBeGreaterThanOrEqual(5);
    expect(scored[0]!.reasons.some((r) => r.toLowerCase().includes("tailoring"))).toBe(true);
  });

  it("awards a freshness bonus for jobs published within 24h", () => {
    const c = candidate({ skills: [] });
    const fresh = job({
      id: "fresh",
      publishedAt: new Date(NOW.getTime() - 2 * 60 * 60 * 1000),
    });
    const stale = job({
      id: "stale",
      publishedAt: new Date(NOW.getTime() - 48 * 60 * 60 * 1000),
    });
    const scored = scoreJobsForCandidate(c, [fresh, stale], NOW);
    expect(scored[0]!.job.id).toBe("fresh");
  });

  it("excludes jobs with zero score (no city, no region, no skill overlap)", () => {
    const c = candidate({
      city: "Wa",
      region: "Upper West",
      skills: ["welding"],
    });
    const j = job({
      city: "Cape Coast",
      region: "Central",
      title: "Hairdresser",
      category: "Hairdressing & beauty",
      description: "Hair styling and customer service",
    });
    expect(scoreJobsForCandidate(c, [j], NOW)).toEqual([]);
  });

  it("ignores skill stopwords like 'and', 'the' when tokenizing", () => {
    const c = candidate({
      city: "Cape Coast",
      region: "Central",
      skills: ["the and"], // pure stopwords — should yield no overlap
    });
    const j = job({
      city: "Tema",
      region: "Greater Accra",
      title: "And the great job",
    });
    expect(scoreJobsForCandidate(c, [j], NOW)).toEqual([]);
  });
});
