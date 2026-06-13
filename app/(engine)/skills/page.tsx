import Link from "next/link";
import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { getDb } from "@/db/client";
import { skillsTaxonomy } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { getActiveBadges } from "@/lib/assessments/queries";
import { getTranslations } from "@/lib/i18n";

export default async function SkillsPage() {
  const session = await getSession();
  if (!session.userId) redirect("/sign-in?intent=candidate");
  if (session.role === "employer") redirect("/");

  const { t } = await getTranslations();
  const db = getDb();

  const skills = await db
    .select()
    .from(skillsTaxonomy)
    .orderBy(asc(skillsTaxonomy.category), asc(skillsTaxonomy.name));

  const badges = await getActiveBadges(session.userId!);
  const heldSlugs = new Set(badges.map((b) => b.skillSlug));

  return (
    <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold sm:text-3xl">{t.skills.title}</h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        {t.skills.intro}
      </p>

      {/* Held badges */}
      <section className="mt-8">
        <h2 className="text-xs uppercase tracking-wider text-[var(--color-muted)]">
          {t.skills.yourBadgesTitle}
        </h2>
        {badges.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            {t.skills.noBadgesYet}
          </p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {badges.map((b) => {
              const skill = skills.find((s) => s.slug === b.skillSlug);
              return (
                <li
                  key={b.id}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--color-primary-strong)] bg-[var(--color-surface)] px-3 py-1 text-xs text-[var(--color-primary-strong)]"
                >
                  ✓ {skill?.name ?? b.skillSlug}
                  {typeof b.score === "number" && (
                    <span className="text-[var(--color-muted)]">
                      ({b.score}%)
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Catalogue */}
      <ul className="mt-8 space-y-3">
        {skills.length === 0 && (
          <li className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-6 text-sm text-[var(--color-muted)]">
            No assessments are published yet.
          </li>
        )}
        {skills.map((s) => (
          <li
            key={s.slug}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/skills/${s.slug}`}
                  className="text-sm font-semibold hover:underline"
                >
                  {s.name}
                </Link>
                <p className="mt-1 text-xs uppercase tracking-wider text-[var(--color-muted)]">
                  {s.category}
                </p>
                <p className="mt-2 text-sm text-[var(--color-muted)]">
                  {s.description}
                </p>
              </div>
              {heldSlugs.has(s.slug) && (
                <span className="rounded-full bg-[var(--color-primary)]/15 px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--color-primary-strong)]">
                  ✓ {t.skills.earned}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
