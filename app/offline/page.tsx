export const metadata = {
  title: "Offline — Ghana Youth Jobs",
};

export default function OfflinePage() {
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
        <h1 className="text-2xl font-semibold">You&apos;re offline</h1>
        <p className="mt-3 text-sm text-[var(--color-muted)]">
          We couldn&apos;t reach the internet. Check your data or Wi-Fi and try
          again. Pages you already opened may still work.
        </p>
        <a
          href="/"
          className="mt-6 rounded-md bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--color-primary-strong)]"
        >
          Try again
        </a>
        <p className="mt-6 text-xs text-[var(--color-muted)]">
          Tip: this app works on low data. Add it to your home screen for
          faster access.
        </p>
      </section>
    </main>
  );
}
