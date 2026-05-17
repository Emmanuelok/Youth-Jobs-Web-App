import { describe, it, expect } from "vitest";
import { buildSmsDigest } from "@/lib/notify/digest";
import type { ScoredJob } from "@/lib/notify/match";

function scored(overrides: Partial<ScoredJob["job"]> = {}): ScoredJob {
  return {
    job: {
      id: "job_1",
      title: "Junior tailor",
      type: "job",
      category: "Tailoring & garment making",
      city: "Kumasi",
      region: "Ashanti",
      description: "Sewing work",
      payAmountGhs: 800,
      payPeriod: "month",
      minimumAge: 18,
      isHazardous: false,
      publishedAt: new Date(),
      ...overrides,
    },
    score: 5,
    reasons: [],
  };
}

const APP = "https://gyj.app";

describe("buildSmsDigest", () => {
  it("always includes the anti-scam reminder", () => {
    const body = buildSmsDigest([scored()], APP);
    expect(body.toLowerCase()).toContain("never pay to apply");
  });

  it("fits within ~320 characters even with 3 max-length matches", () => {
    const long = (id: string) =>
      scored({
        id,
        title:
          "A very long opportunity title that goes on and on for many characters",
        city: "A long-named city in the upper east region",
      });
    const body = buildSmsDigest([long("a"), long("b"), long("c")], APP);
    expect(body.length).toBeLessThanOrEqual(320);
  });

  it("caps the list at 3 matches even if more are passed", () => {
    const many = Array.from({ length: 8 }, (_, i) =>
      scored({ id: `job_${i}`, title: `Role ${i}` }),
    );
    const body = buildSmsDigest(many, APP);
    expect(body).toContain("3 new opportunities");
    expect(body).not.toContain("Role 3");
  });

  it("renders apprenticeships without an amount as 'apprentice'", () => {
    const body = buildSmsDigest(
      [scored({ payAmountGhs: null, payPeriod: "unpaid_with_skills" })],
      APP,
    );
    expect(body).toContain("apprentice");
  });

  it("singular phrasing for one match", () => {
    const body = buildSmsDigest([scored()], APP);
    expect(body).toContain("1 new opportunity");
  });
});
