"use client";

import { useEffect } from "react";
import { getClientDict } from "@/lib/i18n/client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = getClientDict();

  useEffect(() => {
    // Surface to the console (and Sentry's client hook if present). The digest
    // correlates with the server-side captured error.
    console.error("[app:error]", error.digest ?? "", error.message);
  }, [error]);

  return (
    <main className="min-h-screen">
      <section className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <span
          aria-hidden
          className="mb-5 inline-block h-12 w-12 rounded-xl"
          style={{
            background:
              "linear-gradient(135deg, var(--color-primary-strong), var(--color-accent))",
          }}
        />
        <h1 className="text-2xl font-semibold">{t.errors.errorTitle}</h1>
        <p className="mt-3 text-sm text-[var(--color-muted)]">
          {t.errors.errorBody}
        </p>
        {error.digest && (
          <p className="mt-2 text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
            Ref: {error.digest}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-md bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--color-primary-strong)]"
          >
            {t.errors.tryAgain}
          </button>
          <a
            href="/"
            className="rounded-md border border-[var(--color-border)] px-5 py-3 text-sm font-semibold hover:border-[var(--color-primary-strong)]"
          >
            {t.errors.goHome}
          </a>
        </div>
      </section>
    </main>
  );
}
