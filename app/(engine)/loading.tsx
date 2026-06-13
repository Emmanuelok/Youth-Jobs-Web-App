/**
 * Skeleton shown during server-render of engine routes. On a slow Ghanaian
 * mobile connection this is the difference between a blank white screen and
 * visible "it's working" feedback. Pure CSS, no JS, no data.
 */
export default function Loading() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6" aria-busy="true">
      <div className="h-7 w-40 animate-pulse rounded bg-[var(--color-surface-2)]" />
      <div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-[var(--color-surface)]" />
      <div className="mt-8 space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
          >
            <div className="h-4 w-1/2 animate-pulse rounded bg-[var(--color-surface-2)]" />
            <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-[var(--color-surface-2)]" />
            <div className="mt-3 h-3 w-full animate-pulse rounded bg-[var(--color-surface-2)]" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </section>
  );
}
