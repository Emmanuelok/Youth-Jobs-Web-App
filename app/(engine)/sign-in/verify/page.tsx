import { getTranslations } from "@/lib/i18n";
import { verifyOtpAction } from "../actions";

export default async function VerifyOtpPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string; intent?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const phone = sp.phone ?? "";
  const intent = sp.intent === "employer" ? "employer" : "candidate";
  const error = sp.error;
  const { t } = await getTranslations();

  return (
    <section className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold sm:text-3xl">{t.signIn.verifyTitle}</h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        {t.signIn.verifyIntro}{" "}
        <span className="text-[var(--color-text)]">{phone || "your phone"}</span>
        . {t.signIn.verifyExpiry}
      </p>

      {error && (
        <div className="mt-4 rounded-md border border-[var(--color-danger)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-danger)]">
          {error}
        </div>
      )}

      <form action={verifyOtpAction} className="mt-6 space-y-4">
        <input type="hidden" name="phone" value={phone} />
        <input type="hidden" name="intent" value={intent} />

        <div>
          <label htmlFor="code" className="block text-xs uppercase tracking-wider text-[var(--color-muted)]">
            {t.signIn.codeLabel}
          </label>
          <input
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            autoComplete="one-time-code"
            placeholder="123456"
            required
            className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-center text-lg tracking-[0.5em] focus:border-[var(--color-primary-strong)] focus:outline-none"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--color-primary-strong)]"
        >
          {t.signIn.verifyContinue}
        </button>
      </form>

      <p className="mt-6 text-xs text-[var(--color-muted)]">
        {t.signIn.noCode}{" "}
        <a
          href={`/sign-in?intent=${intent}`}
          className="underline hover:text-[var(--color-text)]"
        >
          {t.signIn.sendNew}
        </a>
        .
      </p>
    </section>
  );
}
