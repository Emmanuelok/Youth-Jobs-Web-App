import { getSetupErrors } from "@/lib/setup";
import { EngineHeader } from "./_components/header";

// All engine routes read sessions/DB at request time — never prerender.
export const dynamic = "force-dynamic";

export default async function EngineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const errors = getSetupErrors();
  if (errors.length > 0) {
    return (
      <main className="min-h-screen">
        <EngineHeader />
        <section className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
          <h1 className="text-2xl font-semibold">Setup required</h1>
          <p className="mt-3 text-sm text-[var(--color-muted)]">
            The engine is deployed but not yet wired to a database or session
            secret. Fix these in the Vercel dashboard, then redeploy.
          </p>
          <ul className="mt-6 space-y-3">
            {errors.map((e) => (
              <li
                key={e}
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm"
              >
                {e}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xs text-[var(--color-muted)]">
            See <code className="rounded bg-[var(--color-surface)] px-1">.env.example</code>{" "}
            in the repository for the full list of variables.
          </p>
        </section>
      </main>
    );
  }
  return (
    <main className="min-h-screen">
      <EngineHeader />
      {children}
    </main>
  );
}
