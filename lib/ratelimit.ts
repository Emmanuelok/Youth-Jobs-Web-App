import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { log } from "@/lib/log";

/**
 * Per-action rate limits. Each name maps to its own sliding window.
 * Identifiers are the user ID (or phone/IP for unauthed flows). Hits the
 * platform's primary abuse vectors: applying, messaging, posting, reporting.
 *
 * If UPSTASH_REDIS_REST_URL/_TOKEN are absent, the limiter no-ops (always
 * allow) and logs a one-time warning. This keeps local dev frictionless
 * while production should always have credentials set.
 */

let cached: ReturnType<typeof buildLimiters> | null = null;
let warned = false;

type LimitConfig = { limit: number; window: `${number} ${"s" | "m" | "h" | "d"}` };

const LIMITS = {
  apply: { limit: 10, window: "1 h" },
  message_send: { limit: 30, window: "1 h" },
  conversation_start: { limit: 20, window: "1 h" },
  scam_report: { limit: 5, window: "1 h" },
  job_post: { limit: 10, window: "1 h" },
  guardian_request: { limit: 3, window: "1 h" },
  cv_generate: { limit: 5, window: "1 h" },
} as const satisfies Record<string, LimitConfig>;

export type LimiterName = keyof typeof LIMITS;

function buildLimiters() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    if (!warned) {
      log.warn("ratelimit.disabled", {
        reason: "UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set",
      });
      warned = true;
    }
    return null;
  }
  const redis = new Redis({ url, token });
  const out = {} as Record<LimiterName, Ratelimit>;
  for (const [name, cfg] of Object.entries(LIMITS) as [LimiterName, LimitConfig][]) {
    out[name] = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(cfg.limit, cfg.window),
      analytics: true,
      prefix: `gyj:rl:${name}`,
    });
  }
  return out;
}

export type RateLimitResult =
  | { ok: true }
  | { ok: false; reason: "rate_limited"; resetSeconds: number };

/**
 * Check a rate limit. Returns { ok: true } if allowed, otherwise the
 * number of seconds until reset.
 *
 * Falls open (always allow) when Upstash is not configured. Falls closed
 * (allow but log) on Upstash errors so transient outages don't lock users
 * out of the platform.
 */
export async function checkLimit(
  name: LimiterName,
  identifier: string,
): Promise<RateLimitResult> {
  if (!cached) cached = buildLimiters();
  if (!cached) return { ok: true };

  try {
    const result = await cached[name].limit(identifier);
    if (result.success) return { ok: true };
    const resetSeconds = Math.max(
      1,
      Math.ceil((result.reset - Date.now()) / 1000),
    );
    log.warn("ratelimit.blocked", { name, identifier, resetSeconds });
    return { ok: false, reason: "rate_limited", resetSeconds };
  } catch (err) {
    log.error("ratelimit.check_failed", {
      name,
      identifier,
      error: err instanceof Error ? err.message : String(err),
    });
    return { ok: true };
  }
}
