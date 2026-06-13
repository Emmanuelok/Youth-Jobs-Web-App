import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { createBlankAssessmentAction } from "../actions";

const inputCls =
  "mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary-strong)] focus:outline-none";

export default async function NewAssessmentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const session = await getSession();
  if (!session.userId || session.role !== "admin") redirect("/");

  return (
    <section className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link
        href="/admin/assessments"
        className="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)]"
      >
        ← Back to assessments
      </Link>
      <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">New assessment</h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Creates the assessment in <strong>inactive</strong> state. Add the
        questions in psql / drizzle-studio, then activate it from the list.
        A proper question editor is planned but not yet shipped.
      </p>

      {sp.error && (
        <div className="mt-4 rounded-md border border-[var(--color-danger)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-danger)]">
          {sp.error}
        </div>
      )}

      <form action={createBlankAssessmentAction} className="mt-6 space-y-4">
        <div>
          <label className="block text-xs uppercase tracking-wider text-[var(--color-muted)]">
            Skill slug (stable id, e.g. <code>basic_numeracy</code>)
          </label>
          <input name="skillSlug" required pattern="[a-z0-9_]+" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-[var(--color-muted)]">
            Skill display name
          </label>
          <input name="skillName" required className={inputCls} />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-[var(--color-muted)]">
            Skill category
          </label>
          <select name="skillCategory" defaultValue="" className={inputCls}>
            <option value="" disabled>Choose</option>
            <option value="literacy">literacy</option>
            <option value="numeracy">numeracy</option>
            <option value="language">language</option>
            <option value="soft">soft</option>
            <option value="digital">digital</option>
            <option value="trade">trade</option>
            <option value="other">other</option>
          </select>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-[var(--color-muted)]">
            Skill description
          </label>
          <textarea name="skillDescription" rows={2} className={`${inputCls} resize-y`} />
        </div>

        <hr className="border-[var(--color-border)]" />

        <div>
          <label className="block text-xs uppercase tracking-wider text-[var(--color-muted)]">
            Assessment title
          </label>
          <input name="title" required className={inputCls} />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-[var(--color-muted)]">
            Intro text (shown to the candidate before they start)
          </label>
          <textarea name="introText" rows={3} required className={`${inputCls} resize-y`} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-[var(--color-muted)]">
              Passing score (%)
            </label>
            <input
              type="number"
              name="passingScore"
              min={0}
              max={100}
              defaultValue={70}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-[var(--color-muted)]">
              Language
            </label>
            <select name="language" defaultValue="en" className={inputCls}>
              <option value="en">English</option>
              <option value="tw">Twi</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--color-primary-strong)]"
        >
          Create (inactive)
        </button>
      </form>
    </section>
  );
}
