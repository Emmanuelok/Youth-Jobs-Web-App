import { requestOtpAction } from "./actions";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ intent?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const intent = sp.intent === "employer" ? "employer" : "candidate";
  const error = sp.error;

  return (
    <section className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold sm:text-3xl">
        {intent === "employer" ? "Post a job or apprenticeship" : "Find work"}
      </h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Enter your Ghana mobile number. We&apos;ll send a 6-digit code by SMS.
        We will never charge you to apply for a job.
      </p>

      {error && (
        <div className="mt-4 rounded-md border border-[var(--color-danger)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-danger)]">
          {error}
        </div>
      )}

      <form action={requestOtpAction} className="mt-6 space-y-4">
        <input type="hidden" name="intent" value={intent} />

        <div className="flex gap-2 text-xs">
          <a
            href="/sign-in?intent=candidate"
            className={`rounded-full border px-3 py-1.5 ${
              intent === "candidate"
                ? "border-[var(--color-primary-strong)] text-[var(--color-text)]"
                : "border-[var(--color-border)] text-[var(--color-muted)]"
            }`}
          >
            I&apos;m looking for work
          </a>
          <a
            href="/sign-in?intent=employer"
            className={`rounded-full border px-3 py-1.5 ${
              intent === "employer"
                ? "border-[var(--color-primary-strong)] text-[var(--color-text)]"
                : "border-[var(--color-border)] text-[var(--color-muted)]"
            }`}
          >
            I&apos;m hiring
          </a>
        </div>

        <div>
          <label htmlFor="phone" className="block text-xs uppercase tracking-wider text-[var(--color-muted)]">
            Phone number
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0244 123 456"
            required
            className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-sm placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary-strong)] focus:outline-none"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--color-primary-strong)]"
        >
          Send code
        </button>
      </form>

      <p className="mt-6 text-xs text-[var(--color-muted)]">
        By continuing you agree that we can send you SMS for sign-in and
        application updates. Standard SMS rates may apply.
      </p>
    </section>
  );
}
