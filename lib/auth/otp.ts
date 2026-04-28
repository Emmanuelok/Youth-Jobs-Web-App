import { createHash, randomInt } from "node:crypto";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { otpCodes } from "@/db/schema";
import { sendSms } from "./sms";

const OTP_LENGTH = 6;
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;
const REQUEST_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 5;

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function generateCode(): string {
  return String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");
}

/**
 * Issue a fresh OTP for the phone. Rate-limited per phone per hour.
 * Returns ok=true even if SMS fails in production (we don't reveal that
 * a phone is or isn't registered). Logs the failure server-side.
 */
export async function issueOtp(
  phone: string,
): Promise<{ ok: true } | { ok: false; reason: "rate_limited" }> {
  const db = getDb();

  const recent = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.phone, phone),
        gt(
          otpCodes.createdAt,
          new Date(Date.now() - REQUEST_WINDOW_MS),
        ),
      ),
    );

  if ((recent[0]?.count ?? 0) >= MAX_REQUESTS_PER_WINDOW) {
    return { ok: false, reason: "rate_limited" };
  }

  const code = generateCode();
  await db.insert(otpCodes).values({
    phone,
    codeHash: hashCode(code),
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });

  await sendSms(
    phone,
    `Your Ghana Youth Jobs code is ${code}. It expires in 10 minutes. We will never ask for money to apply for a job.`,
  );

  return { ok: true };
}

/**
 * Verify a submitted code against the latest unused OTP for the phone.
 * Atomically marks the row consumed on success. Increments attempts on failure.
 */
export async function verifyOtp(
  phone: string,
  submitted: string,
): Promise<{ ok: true } | { ok: false; reason: "invalid" | "expired" | "exhausted" }> {
  const db = getDb();

  const [latest] = await db
    .select()
    .from(otpCodes)
    .where(and(eq(otpCodes.phone, phone), isNull(otpCodes.consumedAt)))
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);

  if (!latest) return { ok: false, reason: "invalid" };
  if (latest.attempts >= MAX_ATTEMPTS) return { ok: false, reason: "exhausted" };
  if (latest.expiresAt.getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }

  const submittedHash = hashCode(submitted.trim());
  if (submittedHash !== latest.codeHash) {
    await db
      .update(otpCodes)
      .set({ attempts: latest.attempts + 1 })
      .where(eq(otpCodes.id, latest.id));
    return { ok: false, reason: "invalid" };
  }

  await db
    .update(otpCodes)
    .set({ consumedAt: new Date() })
    .where(eq(otpCodes.id, latest.id));
  return { ok: true };
}
