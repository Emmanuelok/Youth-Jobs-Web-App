import type { ScoredJob } from "./match";

const MAX_MATCHES = 3;
const MAX_SMS_LEN = 320; // GSM-7 / two concatenated SMS pages — most carriers handle this fine

/**
 * Builds an SMS digest. Trust language ("free, never pay to apply") is
 * non-negotiable — it's the single most important anti-scam reminder we
 * can deliver outside the app.
 */
export function buildSmsDigest(matches: ScoredJob[], appUrl: string): string {
  const top = matches.slice(0, MAX_MATCHES);

  const lines: string[] = [
    `${top.length} new ${top.length === 1 ? "opportunity" : "opportunities"} for you:`,
  ];
  top.forEach((m, i) => {
    lines.push(`${i + 1}) ${shortJobLine(m)}`);
  });
  lines.push(`See all: ${appUrl}/jobs (free, never pay to apply)`);

  let body = lines.join("\n");
  if (body.length > MAX_SMS_LEN) {
    // Re-build with shorter labels until we fit.
    const trimmed = top.map((m) => `${trimTo(m.job.title, 36)} — ${m.job.city}`);
    body = [
      `${top.length} new ${top.length === 1 ? "opportunity" : "opportunities"}:`,
      ...trimmed.map((t, i) => `${i + 1}) ${t}`),
      `${appUrl}/jobs`,
      "Free. Never pay to apply.",
    ].join("\n");
  }
  return body.length > MAX_SMS_LEN ? body.slice(0, MAX_SMS_LEN - 1) + "…" : body;
}

function shortJobLine(m: ScoredJob): string {
  const { job } = m;
  const pay = job.payAmountGhs
    ? `GHS ${job.payAmountGhs.toLocaleString()}/${job.payPeriod}`
    : job.payPeriod === "unpaid_with_skills"
      ? "apprentice"
      : job.type;
  return `${trimTo(job.title, 38)} — ${job.city} (${pay})`;
}

function trimTo(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1).trimEnd() + "…";
}
