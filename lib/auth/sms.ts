/**
 * SMS provider abstraction.
 *
 * MVP options:
 *   - "stub"    (default) — log the message to the server console (dev only).
 *   - "arkesel" — Ghana-focused gateway. Requires ARKESEL_API_KEY and
 *                 ARKESEL_SENDER_ID. Sender ID must be ≤11 alphanumeric chars
 *                 and registered with Arkesel before it will deliver.
 *   - "hubtel"  — TODO: implement before launch if Arkesel doesn't suit.
 *
 * Never log full OTP codes in production. The stub gates on NODE_ENV.
 */

import { log } from "@/lib/log";

export type SmsResult = { ok: true } | { ok: false; error: string };

export async function sendSms(toE164: string, body: string): Promise<SmsResult> {
  const provider = process.env.SMS_PROVIDER ?? "stub";

  switch (provider) {
    case "stub":
      if (process.env.NODE_ENV !== "production") {
        log.info("sms.stub.send", { to: toE164, body });
      } else {
        log.info("sms.stub.send", { to: toE164, body: "<redacted>" });
      }
      return { ok: true };

    case "arkesel": {
      const result = await sendViaArkesel(toE164, body);
      if (result.ok) {
        log.info("sms.send", { provider, to: toE164, bytes: body.length });
      } else {
        log.error("sms.send_failed", {
          provider,
          to: toE164,
          error: result.error,
        });
      }
      return result;
    }

    case "hubtel":
      log.warn("sms.provider_not_implemented", { provider });
      return {
        ok: false,
        error: 'SMS_PROVIDER="hubtel" is not yet implemented',
      };

    default:
      log.warn("sms.provider_unknown", { provider });
      return { ok: false, error: `Unknown SMS_PROVIDER "${provider}"` };
  }
}

async function sendViaArkesel(
  toE164: string,
  body: string,
): Promise<SmsResult> {
  const apiKey = process.env.ARKESEL_API_KEY;
  const sender = process.env.ARKESEL_SENDER_ID ?? "GhYouthJobs";
  if (!apiKey) {
    return { ok: false, error: "ARKESEL_API_KEY is not set" };
  }

  // Arkesel expects MSISDN without the leading "+".
  const recipient = toE164.startsWith("+") ? toE164.slice(1) : toE164;

  try {
    const res = await fetch("https://sms.arkesel.com/api/v2/sms/send", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender,
        message: body,
        recipients: [recipient],
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "<unreadable>");
      return {
        ok: false,
        error: `Arkesel HTTP ${res.status}: ${text.slice(0, 200)}`,
      };
    }

    const json = (await res.json().catch(() => ({}))) as {
      status?: string;
      message?: string;
    };
    if (json.status && json.status !== "success") {
      return {
        ok: false,
        error: `Arkesel response: ${json.status} ${json.message ?? ""}`.trim(),
      };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: `Arkesel request failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
