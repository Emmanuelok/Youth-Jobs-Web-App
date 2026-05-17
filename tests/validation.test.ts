import { describe, it, expect } from "vitest";
import {
  apprenticeshipTermsSchema,
  candidateProfileSchema,
  employerProfileSchema,
  jobPostSchema,
  messageBodySchema,
  normaliseGhanaPhone,
  otpSchema,
  phoneSchema,
  scamReportSchema,
} from "@/lib/validation";

describe("normaliseGhanaPhone", () => {
  it("accepts +233 format", () => {
    expect(normaliseGhanaPhone("+233244123456")).toBe("+233244123456");
  });

  it("accepts 233 prefix without +", () => {
    expect(normaliseGhanaPhone("233244123456")).toBe("+233244123456");
  });

  it("accepts 0XX local format", () => {
    expect(normaliseGhanaPhone("0244123456")).toBe("+233244123456");
  });

  it("strips spaces, dashes, parens", () => {
    expect(normaliseGhanaPhone("0244 123 456")).toBe("+233244123456");
    expect(normaliseGhanaPhone("(024) 412-3456")).toBe("+233244123456");
  });

  it("returns null for non-Ghana numbers", () => {
    expect(normaliseGhanaPhone("+1234567890")).toBeNull();
  });

  it("returns null for too-short input", () => {
    expect(normaliseGhanaPhone("024412345")).toBeNull();
  });
});

describe("phoneSchema (zod)", () => {
  it("normalises and validates a 0XX number", () => {
    const r = phoneSchema.safeParse("0244 123 456");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe("+233244123456");
  });

  it("rejects only-spaces", () => {
    const r = phoneSchema.safeParse("   ");
    expect(r.success).toBe(false);
  });

  it("rejects a US-format number", () => {
    const r = phoneSchema.safeParse("+15551234567");
    expect(r.success).toBe(false);
  });
});

describe("otpSchema", () => {
  it("accepts exactly 6 digits", () => {
    expect(otpSchema.safeParse("123456").success).toBe(true);
  });

  it("rejects 5 digits and 7 digits", () => {
    expect(otpSchema.safeParse("12345").success).toBe(false);
    expect(otpSchema.safeParse("1234567").success).toBe(false);
  });

  it("rejects non-numeric", () => {
    expect(otpSchema.safeParse("12345a").success).toBe(false);
  });
});

describe("candidateProfileSchema", () => {
  const baseGood = {
    fullName: "Ama Mensah",
    city: "Kumasi",
    region: "Ashanti",
    educationLevel: "shs",
    skills: ["tailoring", "customer care"],
    languages: ["en", "tw"],
    availability: "immediate",
    yearOfBirth: 2002,
  };

  it("accepts a known-good profile", () => {
    expect(candidateProfileSchema.safeParse(baseGood).success).toBe(true);
  });

  it("rejects a yearOfBirth that would make the candidate < 13", () => {
    const r = candidateProfileSchema.safeParse({
      ...baseGood,
      yearOfBirth: new Date().getFullYear() - 5,
    });
    expect(r.success).toBe(false);
  });

  it("rejects more than 5 skills", () => {
    const r = candidateProfileSchema.safeParse({
      ...baseGood,
      skills: ["a", "b", "c", "d", "e", "f"],
    });
    expect(r.success).toBe(false);
  });

  it("rejects unknown education level", () => {
    const r = candidateProfileSchema.safeParse({
      ...baseGood,
      educationLevel: "phd",
    });
    expect(r.success).toBe(false);
  });
});

describe("employerProfileSchema", () => {
  it("accepts ghanaCardLast4 as exactly 4 digits", () => {
    const good = {
      organizationName: "Acme Tailors",
      organizationType: "artisan",
      city: "Accra",
      region: "Greater Accra",
      contactName: "Ama",
      ghanaCardLast4: "1234",
    };
    expect(employerProfileSchema.safeParse(good).success).toBe(true);
  });

  it("rejects ghanaCardLast4 with more than 4 digits", () => {
    const bad = {
      organizationName: "Acme Tailors",
      organizationType: "artisan",
      city: "Accra",
      region: "Greater Accra",
      contactName: "Ama",
      ghanaCardLast4: "12345",
    };
    expect(employerProfileSchema.safeParse(bad).success).toBe(false);
  });
});

describe("jobPostSchema", () => {
  it("accepts unpaid-with-skills with no pay amount", () => {
    const good = {
      type: "apprenticeship",
      title: "Tailoring apprentice",
      description: "Learn tailoring at our shop in Kumasi over 12 months.",
      category: "Tailoring & garment making",
      city: "Kumasi",
      region: "Ashanti",
      payAmountGhs: null,
      payPeriod: "unpaid_with_skills",
      minimumAge: 16,
      isHazardous: false,
    };
    expect(jobPostSchema.safeParse(good).success).toBe(true);
  });

  it("rejects a minimumAge below 15", () => {
    const r = jobPostSchema.safeParse({
      type: "job",
      title: "Helper",
      description: "Short description here for the role.",
      category: "Retail & shopkeeping",
      city: "Accra",
      region: "Greater Accra",
      payAmountGhs: 500,
      payPeriod: "month",
      minimumAge: 12,
      isHazardous: false,
    });
    expect(r.success).toBe(false);
  });
});

describe("apprenticeshipTermsSchema", () => {
  it("accepts a complete terms block", () => {
    expect(
      apprenticeshipTermsSchema.safeParse({
        durationMonths: 12,
        hoursPerWeek: 35,
        stipendAmountGhs: 200,
        stipendPeriod: "month",
        startTimeOfDay: "08:00",
        endTimeOfDay: "17:00",
        daysOffPerWeek: 1,
        trainingTopics: ["cutting", "sewing"],
        completionOutcome: "Certificate of mastery on completion.",
      }).success,
    ).toBe(true);
  });

  it("rejects malformed times", () => {
    const r = apprenticeshipTermsSchema.safeParse({
      durationMonths: 12,
      hoursPerWeek: 35,
      stipendAmountGhs: null,
      stipendPeriod: null,
      startTimeOfDay: "8am",
      endTimeOfDay: "5pm",
      daysOffPerWeek: 1,
      trainingTopics: ["cutting"],
      completionOutcome: "Certificate on completion.",
    });
    expect(r.success).toBe(false);
  });
});

describe("messageBodySchema", () => {
  it("rejects empty / whitespace-only", () => {
    expect(messageBodySchema.safeParse("   ").success).toBe(false);
  });

  it("rejects > 2000 chars", () => {
    expect(messageBodySchema.safeParse("a".repeat(2001)).success).toBe(false);
  });

  it("trims and accepts normal text", () => {
    const r = messageBodySchema.safeParse("  hello  ");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe("hello");
  });
});

describe("scamReportSchema", () => {
  it("rejects unknown category", () => {
    expect(
      scamReportSchema.safeParse({
        jobId: "550e8400-e29b-41d4-a716-446655440000",
        category: "spam",
      }).success,
    ).toBe(false);
  });

  it("accepts a valid (jobId, category) pair", () => {
    expect(
      scamReportSchema.safeParse({
        jobId: "550e8400-e29b-41d4-a716-446655440000",
        category: "asks_for_money",
      }).success,
    ).toBe(true);
  });
});
