/**
 * Lightweight scam-pattern screening for in-app messages.
 *
 * Three severities:
 *   - "high"   — refused before insert. Persistent legitimate uses are rare;
 *                false positives can be re-phrased.
 *   - "medium" — message goes through, recipient sees a warning banner,
 *                admin sees it in the moderation queue.
 *   - "low"    — message goes through, no recipient banner, admin can
 *                still see it in the queue.
 *
 * The trust contract of the platform is "free for job seekers, never pay
 * to apply". HIGH is reserved for content that directly violates that
 * contract or asks for credentials.
 *
 * This is NOT a substitute for human moderation — it is a first line.
 */

export type ScreenSeverity = "high" | "medium" | "low";

export type ScreenResult = {
  severity: ScreenSeverity | null;
  reasons: string[];
};

/**
 * HIGH — refuse before insert. Each pattern carries a short reason string
 * that we surface back to the sender so they understand what got blocked.
 */
const HIGH_PATTERNS: ReadonlyArray<{ rx: RegExp; reason: string }> = [
  {
    rx: /\b(send|share|tell|give)\s+(me\s+)?(the\s+)?(your\s+)?(otp|code|verification\s*code|sms\s*code|pin)\b/i,
    reason: "asks for an OTP or PIN",
  },
  {
    rx: /\b(registration|training|uniform|admin(istrative)?|processing|placement|recruitment|application|interview)\s*(fee|fees|charge|charges|payment|cost)\b/i,
    reason: "asks for a fee — applying must always be free",
  },
  {
    rx: /\bpay(\s+me)?\s+(now|first|before|upfront|in\s+advance)\b/i,
    reason: "demands upfront payment",
  },
  {
    rx: /\b(send|transfer)\s+(me\s+)?(money|cash|funds)\b.*\b(before|first|now|today)\b/i,
    reason: "demands money up front",
  },
];

const MEDIUM_PATTERNS: ReadonlyArray<{ rx: RegExp; reason: string }> = [
  {
    rx: /\b(mtn\s*momo|momo|mobile\s*money|vodafone\s*cash|telecel\s*cash|airteltigo\s*money|atm\s*card)\b/i,
    reason: "mentions a payment method",
  },
  {
    rx: /\bghs?\s*\d{2,}|\d{2,}\s*(cedis?|ghs?)\b/i,
    reason: "mentions a money amount",
  },
  {
    rx: /\b(deposit|wire|transfer|send)\s+(money|funds|cash|ghs|cedis)\b/i,
    reason: "mentions a money transfer",
  },
];

const LOW_PATTERNS: ReadonlyArray<{ rx: RegExp; reason: string }> = [
  {
    rx: /\b(whatsapp|wa)\s+(me|on)\b/i,
    reason: "pushes off-platform to WhatsApp",
  },
  {
    rx: /\b(let'?s|let\s+us)\s+(chat|talk|continue)\s+(outside|elsewhere|on\s+\w+)/i,
    reason: "pushes off-platform",
  },
  {
    rx: /(\+233|233|0)\d{9}\b/,
    reason: "shares a phone number",
  },
];

export function screenMessage(body: string): ScreenResult {
  const reasons: string[] = [];

  for (const { rx, reason } of HIGH_PATTERNS) {
    if (rx.test(body)) reasons.push(reason);
  }
  if (reasons.length > 0) return { severity: "high", reasons };

  for (const { rx, reason } of MEDIUM_PATTERNS) {
    if (rx.test(body)) reasons.push(reason);
  }

  // Combination upgrade: payment method + money amount in the same message
  // is materially more dangerous than either alone.
  const hitsPayment = reasons.some((r) => r.includes("payment method"));
  const hitsAmount = reasons.some((r) => r.includes("money amount"));
  if (hitsPayment && hitsAmount) {
    reasons.push("payment method and amount in the same message");
    return { severity: "high", reasons };
  }
  if (reasons.length > 0) return { severity: "medium", reasons };

  for (const { rx, reason } of LOW_PATTERNS) {
    if (rx.test(body)) reasons.push(reason);
  }
  if (reasons.length > 0) return { severity: "low", reasons };

  return { severity: null, reasons: [] };
}
