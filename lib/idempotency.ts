import { Redis } from "@upstash/redis";

/**
 * Idempotency keys for POST-style server actions that have no natural
 * dedup (no unique constraint, not a pure SET). A hidden input with a
 * fresh UUID is rendered in each protected form; the first submission
 * claims the key, subsequent submissions of the same key are dropped.
 *
 * Falls open on missing Upstash credentials or transient Redis errors —
 * better to occasionally allow a duplicate than to block legitimate users.
 */

let cached: Redis | null = null;
let warned = false;

function client(): Redis | null {
  if (cached) return cached;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    if (!warned) {
      // eslint-disable-next-line no-console
      console.warn(
        "[idempotency] Upstash not configured — duplicate-submit protection DISABLED.",
      );
      warned = true;
    }
    return null;
  }
  cached = new Redis({ url, token });
  return cached;
}

export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}

/**
 * Atomically claim a key. Returns true if this caller is the first to
 * claim it (do the work), false if the key was already claimed (the
 * caller should silently treat it as success and redirect to the
 * appropriate post-action state).
 *
 * Empty / suspiciously short keys also fall open so cURL'd requests
 * without the hidden input still work — rate limits and unique
 * constraints catch the rest.
 */
export async function claimIdempotencyKey(
  key: string,
  ttlSeconds: number = 60,
): Promise<boolean> {
  if (!key || key.length < 8) return true;
  const c = client();
  if (!c) return true;
  try {
    const result = await c.set(`gyj:idem:${key}`, "1", {
      nx: true,
      ex: ttlSeconds,
    });
    return result === "OK";
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[idempotency] claim failed; falling open:", err);
    return true;
  }
}
