/**
 * WhatsApp send abstraction.
 *
 * WhatsApp Business is the right comms channel for Ghana but going live needs
 * Meta business approval, a phone number, and a registered template per
 * message type. None of that is in place yet, so this module is a stub —
 * messages log to the server console in dev and noop in prod. Wire a real
 * provider (360dialog, Twilio, or Meta direct) by setting WHATSAPP_PROVIDER.
 */

import { log } from "@/lib/log";

export type WhatsAppTemplate =
  | "otp"
  | "application_received"
  | "interview_invite"
  | "job_alert_digest"
  | "verification_decision";

export type WhatsAppResult = { ok: true } | { ok: false; error: string };

export async function sendWhatsApp(
  toE164: string,
  template: WhatsAppTemplate,
  variables: Record<string, string>,
): Promise<WhatsAppResult> {
  const provider = process.env.WHATSAPP_PROVIDER ?? "stub";
  switch (provider) {
    case "stub":
      if (process.env.NODE_ENV !== "production") {
        log.info("whatsapp.stub.send", { to: toE164, template, variables });
      }
      return { ok: true };

    case "360dialog":
    case "twilio":
    case "meta":
      log.warn("whatsapp.provider_not_implemented", { provider, template });
      return {
        ok: false,
        error: `WHATSAPP_PROVIDER="${provider}" is not yet implemented`,
      };

    default:
      log.warn("whatsapp.provider_unknown", { provider });
      return { ok: false, error: `Unknown WHATSAPP_PROVIDER "${provider}"` };
  }
}
