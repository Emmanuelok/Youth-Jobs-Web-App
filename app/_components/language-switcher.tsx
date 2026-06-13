import { setLocaleAction } from "@/app/_actions/locale";
import {
  SELECTABLE_LOCALES,
  LOCALE_LABELS,
  type Locale,
} from "@/lib/i18n/locales";

/**
 * Tiny language switcher. Renders one submit button per locale inside a form
 * that POSTs to a server action — so it works with zero client JS. The active
 * locale is shown but disabled.
 */
export function LanguageSwitcher({
  current,
  className = "",
}: {
  current: Locale;
  className?: string;
}) {
  return (
    <form
      action={setLocaleAction}
      className={`inline-flex items-center gap-1 ${className}`}
    >
      {SELECTABLE_LOCALES.map((loc) => {
        const active = loc === current;
        return (
          <button
            key={loc}
            type="submit"
            name="locale"
            value={loc}
            disabled={active}
            aria-current={active ? "true" : undefined}
            className={`rounded-md px-2 py-1 text-xs ${
              active
                ? "bg-[var(--color-surface-2)] font-semibold text-[var(--color-text)]"
                : "text-[var(--color-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            {LOCALE_LABELS[loc]}
          </button>
        );
      })}
    </form>
  );
}
