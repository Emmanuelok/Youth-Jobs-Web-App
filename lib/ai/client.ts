import Anthropic from "@anthropic-ai/sdk";

let cached: Anthropic | null = null;

/**
 * Lazy Anthropic client. Throws only on first use if ANTHROPIC_API_KEY is
 * absent — features that don't depend on the AI keep working.
 */
export function getAnthropic(): Anthropic {
  if (cached) return cached;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it in Vercel → Project → Settings → Environment Variables to enable AI features.",
    );
  }
  cached = new Anthropic({ apiKey });
  return cached;
}
