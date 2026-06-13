import { describe, it, expect } from "vitest";
import { interviewProposalSchema } from "@/lib/validation";

function future(ms: number): string {
  return new Date(Date.now() + ms).toISOString();
}

describe("interviewProposalSchema", () => {
  it("accepts a sensible proposal", () => {
    const r = interviewProposalSchema.safeParse({
      scheduledAt: future(2 * 60 * 60 * 1000),
      durationMinutes: 30,
      mode: "in_person",
      locationOrLink: "Adum branch, Kumasi",
    });
    expect(r.success).toBe(true);
  });

  it("rejects times less than 30 minutes from now", () => {
    const r = interviewProposalSchema.safeParse({
      scheduledAt: future(5 * 60 * 1000),
      durationMinutes: 30,
      mode: "phone",
    });
    expect(r.success).toBe(false);
  });

  it("rejects times more than 90 days out", () => {
    const r = interviewProposalSchema.safeParse({
      scheduledAt: future(100 * 24 * 60 * 60 * 1000),
      durationMinutes: 30,
      mode: "video",
    });
    expect(r.success).toBe(false);
  });

  it("rejects an unknown mode", () => {
    const r = interviewProposalSchema.safeParse({
      scheduledAt: future(60 * 60 * 1000),
      durationMinutes: 30,
      mode: "telepathy",
    });
    expect(r.success).toBe(false);
  });

  it("rejects out-of-range duration", () => {
    const a = interviewProposalSchema.safeParse({
      scheduledAt: future(60 * 60 * 1000),
      durationMinutes: 1,
      mode: "phone",
    });
    const b = interviewProposalSchema.safeParse({
      scheduledAt: future(60 * 60 * 1000),
      durationMinutes: 500,
      mode: "phone",
    });
    expect(a.success).toBe(false);
    expect(b.success).toBe(false);
  });

  it("rejects garbage date strings cleanly", () => {
    const r = interviewProposalSchema.safeParse({
      scheduledAt: "tomorrow",
      durationMinutes: 30,
      mode: "phone",
    });
    expect(r.success).toBe(false);
  });
});
