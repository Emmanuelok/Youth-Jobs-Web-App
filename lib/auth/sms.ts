/**
 * SMS provider abstraction.
 *
 * MVP: stub implementation logs the OTP to the server console. When ready to
 * test with real Ghanaian users, plug in Arkesel or Hubtel by setting
 * SMS_PROVIDER=arkesel|hubtel and the relevant API key env vars, then
 * implement the corresponding case below.
 *
 * Never log full OTP codes in production. The stub is gated on NODE_ENV.
 */

export type SmsResult = { ok: true } | { ok: false; error: string };

export async function sendSms(toE164: string, body: string): Promise<SmsResult> {
  const provider = process.env.SMS_PROVIDER ?? "stub";

  switch (provider) {
    case "stub":
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.log(`[sms:stub] -> ${toE164}: ${body}`);
      } else {
        // eslint-disable-next-line no-console
        console.log(`[sms:stub] -> ${toE164}: <redacted>`);
      }
      return { ok: true };

    case "arkesel":
    case "hubtel":
      // TODO: integrate before launch. Both providers have simple HTTPS APIs.
      return {
        ok: false,
        error: `SMS_PROVIDER="${provider}" is not yet implemented`,
      };

    default:
      return { ok: false, error: `Unknown SMS_PROVIDER "${provider}"` };
  }
}
