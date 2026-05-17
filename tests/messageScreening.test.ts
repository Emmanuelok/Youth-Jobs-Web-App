import { describe, it, expect } from "vitest";
import { screenMessage } from "@/lib/safety/messageScreening";

describe("screenMessage — HIGH (refuse before insert)", () => {
  it("flags OTP solicitation", () => {
    const r = screenMessage("hey, send me the otp code so I can verify you");
    expect(r.severity).toBe("high");
    expect(r.reasons.join(" ")).toMatch(/otp|pin/i);
  });

  it("flags fee asks (registration / training / uniform / interview)", () => {
    for (const phrase of [
      "you must pay a registration fee of GHS 200",
      "training fee is required before you start",
      "uniform fee is 50 cedis",
      "interview fee must be paid first",
      "placement fee applies",
    ]) {
      const r = screenMessage(phrase);
      expect(r.severity, `phrase: ${phrase}`).toBe("high");
    }
  });

  it("flags upfront-payment demands", () => {
    const r = screenMessage("pay me first before I send the details");
    expect(r.severity).toBe("high");
  });

  it("upgrades to HIGH when both payment method and amount appear together", () => {
    const r = screenMessage("send me 50 cedis via MTN MoMo");
    expect(r.severity).toBe("high");
    expect(r.reasons.some((x) => x.includes("payment method and amount"))).toBe(true);
  });
});

describe("screenMessage — MEDIUM (allow, warn recipient)", () => {
  it("flags lone payment-method mentions", () => {
    const r = screenMessage("Do you have MoMo? Just curious for later.");
    expect(r.severity).toBe("medium");
  });

  it("flags lone money-amount mentions", () => {
    const r = screenMessage("The role pays GHS 800 per month for now");
    expect(r.severity).toBe("medium");
  });
});

describe("screenMessage — LOW (allow silently, log only)", () => {
  it("flags off-platform pushes", () => {
    const r = screenMessage("Let's chat outside on whatsapp later");
    expect(r.severity).toBe("low");
  });

  it("flags shared phone numbers", () => {
    const r = screenMessage("Call me on 0244123456 when free");
    expect(r.severity).toBe("low");
  });
});

describe("screenMessage — clean messages", () => {
  it("returns null severity for clean professional messages", () => {
    const r = screenMessage(
      "Hi, thanks for applying. Are you free for a short chat about the role next Tuesday?",
    );
    expect(r.severity).toBeNull();
    expect(r.reasons).toEqual([]);
  });

  it("doesn't false-positive on harmless words like 'pay attention'", () => {
    const r = screenMessage("Please pay attention to the role details we sent");
    expect(r.severity).toBeNull();
  });
});
