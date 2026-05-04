import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";

export async function EngineHeader() {
  let role: "candidate" | "employer" | "admin" | null = null;
  try {
    const session = await getSession();
    if (session.userId) {
      const db = getDb();
      const [u] = await db
        .select({ role: users.primaryRole })
        .from(users)
        .where(eq(users.id, session.userId))
        .limit(1);
      const r = u?.role;
      if (r === "candidate" || r === "employer" || r === "admin") role = r;
    }
  } catch {
    // env not configured — header still renders, just signed-out
  }

  return (
    <header className="border-b border-[var(--color-border)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block h-6 w-6 rounded-md"
            style={{
              background:
                "linear-gradient(135deg, var(--color-primary-strong), var(--color-accent))",
            }}
          />
          <span className="text-sm font-semibold">Ghana Youth Jobs</span>
        </Link>
        <nav className="flex items-center gap-2 text-xs sm:text-sm">
          <Link
            href="/jobs"
            className="rounded-md px-3 py-1.5 text-[var(--color-muted)] hover:text-[var(--color-text)]"
          >
            Find work
          </Link>
          {role === "candidate" && (
            <Link
              href="/cv"
              className="rounded-md px-3 py-1.5 text-[var(--color-muted)] hover:text-[var(--color-text)]"
            >
              My CV
            </Link>
          )}
          {role === "employer" && (
            <Link
              href="/employer"
              className="rounded-md px-3 py-1.5 text-[var(--color-muted)] hover:text-[var(--color-text)]"
            >
              Employer
            </Link>
          )}
          {role === "admin" && (
            <Link
              href="/admin"
              className="rounded-md px-3 py-1.5 text-[var(--color-muted)] hover:text-[var(--color-text)]"
            >
              Admin
            </Link>
          )}
          {role ? (
            <form action="/sign-out" method="post">
              <button
                type="submit"
                className="rounded-md border border-[var(--color-border)] px-3 py-1.5 hover:border-[var(--color-primary-strong)]"
              >
                Sign out
              </button>
            </form>
          ) : (
            <Link
              href="/sign-in"
              className="rounded-md border border-[var(--color-border)] px-3 py-1.5 hover:border-[var(--color-primary-strong)]"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
