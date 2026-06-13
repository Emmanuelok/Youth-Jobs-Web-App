import Link from "next/link";
import { getTranslations } from "@/lib/i18n";

export default async function NotFound() {
  const { t } = await getTranslations();
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
        <h1 className="text-2xl font-semibold">{t.errors.notFoundTitle}</h1>
        <p className="mt-3 text-sm text-[var(--color-muted)]">
          {t.errors.notFoundBody}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/jobs"
            className="rounded-md bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--color-primary-strong)]"
          >
            {t.errors.browseJobs}
          </Link>
          <Link
            href="/"
            className="rounded-md border border-[var(--color-border)] px-5 py-3 text-sm font-semibold hover:border-[var(--color-primary-strong)]"
          >
            {t.errors.goHome}
          </Link>
        </div>
      </section>
    </main>
  );
}
