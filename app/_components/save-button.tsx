import { getTranslations } from "@/lib/i18n";
import { toggleSaveJobAction } from "@/app/(engine)/saved/actions";

/**
 * Save / unsave toggle for a job. Pure form POST (no client JS). The caller
 * decides whether to render it (candidates only) and passes the current
 * saved state plus where to return to after the toggle.
 */
export async function SaveButton({
  jobId,
  saved,
  returnTo,
  size = "sm",
}: {
  jobId: string;
  saved: boolean;
  returnTo: string;
  size?: "sm" | "md";
}) {
  const { t } = await getTranslations();
  const pad = size === "md" ? "px-4 py-2.5" : "px-3 py-1.5";
  return (
    <form action={toggleSaveJobAction}>
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button
        type="submit"
        aria-pressed={saved}
        className={`rounded-md border ${pad} text-xs font-semibold ${
          saved
            ? "border-[var(--color-primary-strong)] text-[var(--color-primary-strong)]"
            : "border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-primary-strong)] hover:text-[var(--color-text)]"
        }`}
      >
        {saved ? `★ ${t.saved.saved}` : `☆ ${t.saved.save}`}
      </button>
    </form>
  );
}
