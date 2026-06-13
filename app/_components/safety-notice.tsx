import { getTranslations } from "@/lib/i18n";

/**
 * Localized safety messaging. These strings are the ones where comprehension
 * is literally a safety matter, so they render in the user's chosen language.
 *
 * variant="apply"   → the four-point checklist shown on a job detail page.
 * variant="message" → the inline banner shown above a conversation thread.
 */
export async function SafetyNotice({
  variant,
}: {
  variant: "apply" | "message";
}) {
  const { t } = await getTranslations();

  if (variant === "message") {
    return (
      <div className="mt-4 rounded-md border border-[var(--color-accent)]/40 bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-muted)]">
        <strong className="text-[var(--color-accent)]">{t.safety.title}:</strong>{" "}
        {t.safety.messageWarning}
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-lg border border-[var(--color-accent)]/40 bg-[var(--color-surface)] p-4 text-xs text-[var(--color-muted)]">
      <p className="font-semibold text-[var(--color-accent)]">{t.safety.title}</p>
      <ul className="mt-2 list-disc space-y-1 pl-4">
        <li>{t.safety.neverPay}</li>
        <li>{t.safety.meetPublic}</li>
        <li>{t.safety.tellSomeone}</li>
        <li>{t.safety.leaveAndReport}</li>
      </ul>
    </div>
  );
}
