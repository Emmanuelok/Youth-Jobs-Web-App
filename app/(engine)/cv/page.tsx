import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { candidateProfiles, generatedCvs } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import type { Cv } from "@/lib/ai/cv";
import { generateCvAction } from "./actions";

const inputCls =
  "mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary-strong)] focus:outline-none";

export default async function CvPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const session = await getSession();
  if (!session.userId) redirect("/sign-in?intent=candidate");

  const db = getDb();
  const [profile] = await db
    .select()
    .from(candidateProfiles)
    .where(eq(candidateProfiles.userId, session.userId!))
    .limit(1);
  if (!profile) redirect("/onboarding/candidate");

  const [latest] = await db
    .select()
    .from(generatedCvs)
    .where(eq(generatedCvs.candidateId, session.userId!))
    .orderBy(desc(generatedCvs.createdAt))
    .limit(1);

  const cv = (latest?.payload as Cv | undefined) ?? null;
  const aiConfigured = !!process.env.ANTHROPIC_API_KEY;

  return (
    <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="no-print">
        <h1 className="text-2xl font-semibold sm:text-3xl">Your CV</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          We generate a clean, honest CV from your profile using Claude. Add
          rough notes if you want to mention apprenticeships, school projects,
          or community work — anything we don&apos;t already know about.
        </p>

        {!aiConfigured && (
          <div className="mt-4 rounded-md border border-[var(--color-accent)]/40 bg-[var(--color-surface)] px-3 py-2 text-sm">
            AI CV generator isn&apos;t configured yet. The site admin needs to
            set <code>ANTHROPIC_API_KEY</code> in environment variables.
          </div>
        )}
        {sp.error && (
          <div className="mt-4 rounded-md border border-[var(--color-danger)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-danger)]">
            {sp.error}
          </div>
        )}

        <form
          action={generateCvAction}
          className="mt-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
        >
          <label
            htmlFor="rawNotes"
            className="block text-xs uppercase tracking-wider text-[var(--color-muted)]"
          >
            Anything else we should mention? (optional)
          </label>
          <textarea
            id="rawNotes"
            name="rawNotes"
            rows={5}
            maxLength={2000}
            placeholder="e.g. I helped my uncle's tailoring shop on weekends for 2 years. I led the church youth fellowship in 2024. I built a Facebook page for a fan club."
            className={`${inputCls} resize-y`}
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={!aiConfigured}
              className="rounded-md bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-primary-strong)] disabled:opacity-60"
            >
              {cv ? "Regenerate CV" : "Generate my CV"}
            </button>
            {cv && (
              <button
                type="button"
                className="rounded-md border border-[var(--color-border)] px-4 py-2.5 text-sm font-semibold hover:border-[var(--color-primary-strong)]"
                // Native browser print — server component, no JS needed in event
                // attribute by relying on form submission would be wrong here, so
                // we use the data-print attribute approach. To stay JS-free we
                // instead provide instructions:
                title="Use your browser's Print menu (or Ctrl/⌘+P) to save as PDF."
              >
                Save / Print
              </button>
            )}
            {latest && (
              <span className="text-xs text-[var(--color-muted)]">
                Last generated {new Date(latest.createdAt).toLocaleString()}
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-[var(--color-muted)]">
            We only use what you have shared with us. We never invent jobs,
            schools, or skills.
          </p>
        </form>
      </div>

      {cv && (
        <article className="cv-document mt-8">
          <header className="cv-header">
            <h2>{cv.fullName}</h2>
            <p className="cv-headline">{cv.headline}</p>
            <p className="cv-contact">
              {cv.location.city}, {cv.location.region}
              {cv.languages.length > 0 && (
                <>
                  {" · "}
                  {cv.languages
                    .map((l) => `${l.name} (${l.proficiency})`)
                    .join(", ")}
                </>
              )}
            </p>
          </header>

          <CvSection title="Summary">
            <p>{cv.summary}</p>
          </CvSection>

          {cv.skills.length > 0 && (
            <CvSection title="Skills">
              <ul className="cv-skills">
                {cv.skills.map((s, i) => (
                  <li key={i}>
                    <span className="cv-skill-name">{s.name}</span>
                    <span className="cv-skill-level">{s.level}</span>
                  </li>
                ))}
              </ul>
            </CvSection>
          )}

          {cv.experience.length > 0 && (
            <CvSection title="Experience">
              {cv.experience.map((e, i) => (
                <div className="cv-entry" key={i}>
                  <div className="cv-entry-head">
                    <p className="cv-entry-title">
                      {e.title} <span className="cv-entry-org">— {e.organization}</span>
                    </p>
                    <p className="cv-entry-meta">
                      {e.period}
                      {e.location && ` · ${e.location}`}
                    </p>
                  </div>
                  {e.bullets.length > 0 && (
                    <ul className="cv-bullets">
                      {e.bullets.map((b, j) => (
                        <li key={j}>{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </CvSection>
          )}

          {cv.education.length > 0 && (
            <CvSection title="Education">
              {cv.education.map((ed, i) => (
                <div className="cv-entry" key={i}>
                  <p className="cv-entry-title">
                    {ed.qualification} <span className="cv-entry-org">— {ed.school}</span>
                  </p>
                  <p className="cv-entry-meta">{ed.period}</p>
                </div>
              ))}
            </CvSection>
          )}

          {cv.notes && (
            <CvSection title="Notes for an interview">
              <p>{cv.notes}</p>
            </CvSection>
          )}
        </article>
      )}

      {/* Print-friendly + light-theme document styles. Scoped here so the
          rest of the dark UI is unaffected. */}
      <style>{`
        .cv-document {
          background: #ffffff;
          color: #111827;
          padding: 32px 36px;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          font-family: ui-serif, Georgia, "Times New Roman", serif;
          line-height: 1.5;
        }
        .cv-document h2 {
          margin: 0;
          font-size: 28px;
          letter-spacing: -0.01em;
        }
        .cv-document .cv-headline {
          margin: 4px 0 0;
          font-size: 14px;
          color: #4b5563;
        }
        .cv-document .cv-contact {
          margin: 4px 0 0;
          font-size: 12px;
          color: #6b7280;
        }
        .cv-document section {
          margin-top: 22px;
        }
        .cv-document h3 {
          margin: 0 0 8px;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #6b7280;
          font-family: ui-sans-serif, system-ui, sans-serif;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 4px;
        }
        .cv-document .cv-entry { margin-bottom: 12px; }
        .cv-document .cv-entry-head {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        .cv-document .cv-entry-title { margin: 0; font-weight: 600; font-size: 14px; }
        .cv-document .cv-entry-org { font-weight: 400; color: #4b5563; }
        .cv-document .cv-entry-meta { margin: 0; font-size: 12px; color: #6b7280; }
        .cv-document .cv-bullets { margin: 6px 0 0 18px; padding: 0; font-size: 13px; }
        .cv-document .cv-bullets li { margin-bottom: 2px; }
        .cv-document .cv-skills {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 6px 12px;
        }
        .cv-document .cv-skills li {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
        }
        .cv-document .cv-skill-level {
          color: #6b7280;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        @media print {
          body { background: #ffffff !important; }
          .no-print { display: none !important; }
          .cv-document {
            border: none;
            border-radius: 0;
            padding: 0;
            margin: 0;
          }
        }
      `}</style>
    </section>
  );
}

function CvSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3>{title}</h3>
      {children}
    </section>
  );
}
