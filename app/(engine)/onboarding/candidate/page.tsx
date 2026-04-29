import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { candidateProfiles } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { GHANA_REGIONS, LANGUAGES, PRIMARY_CITIES } from "@/lib/ghana";
import { saveCandidateProfileAction } from "./actions";

export default async function CandidateOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const session = await getSession();
  if (!session.userId) redirect("/sign-in?intent=candidate");

  const db = getDb();
  const [existing] = await db
    .select()
    .from(candidateProfiles)
    .where(eq(candidateProfiles.userId, session.userId))
    .limit(1);

  const thisYear = new Date().getFullYear();

  return (
    <section className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold sm:text-3xl">Build your profile</h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        No CV needed. Tell us a bit about yourself so we can show you
        opportunities near you. You can edit this any time.
      </p>

      {sp.error && (
        <div className="mt-4 rounded-md border border-[var(--color-danger)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-danger)]">
          {sp.error}
        </div>
      )}

      <form action={saveCandidateProfileAction} className="mt-6 space-y-5">
        <Field label="Full name">
          <input
            name="fullName"
            required
            defaultValue={existing?.fullName ?? ""}
            className={inputCls}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="City or town">
            <input
              name="city"
              required
              list="primary-cities"
              defaultValue={existing?.city ?? ""}
              className={inputCls}
            />
            <datalist id="primary-cities">
              {PRIMARY_CITIES.map((c) => (
                <option key={c.city} value={c.city} />
              ))}
            </datalist>
          </Field>
          <Field label="Region">
            <select
              name="region"
              required
              defaultValue={existing?.region ?? ""}
              className={inputCls}
            >
              <option value="" disabled>Choose region</option>
              {GHANA_REGIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Highest education">
            <select
              name="educationLevel"
              required
              defaultValue={existing?.educationLevel ?? ""}
              className={inputCls}
            >
              <option value="" disabled>Choose</option>
              <option value="none">None</option>
              <option value="jhs">JHS / Middle school</option>
              <option value="shs">SHS</option>
              <option value="tvet">TVET / Technical</option>
              <option value="university">University / Polytechnic</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Year of birth">
            <input
              type="number"
              name="yearOfBirth"
              required
              min={1950}
              max={thisYear - 13}
              defaultValue={existing?.yearOfBirth ?? ""}
              className={inputCls}
            />
          </Field>
        </div>

        <Field
          label="Top skills (up to 5)"
          help="Comma-separated. Example: tailoring, customer care, basic Excel."
        >
          <SkillsInput defaultValue={existing?.skills ?? []} />
        </Field>

        <Field label="Languages you speak">
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((l) => (
              <label
                key={l.code}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs"
              >
                <input
                  type="checkbox"
                  name="languages"
                  value={l.code}
                  defaultChecked={existing?.languages?.includes(l.code) ?? false}
                />
                {l.label}
              </label>
            ))}
          </div>
        </Field>

        <Field label="When can you start?">
          <select
            name="availability"
            required
            defaultValue={existing?.availability ?? ""}
            className={inputCls}
          >
            <option value="" disabled>Choose</option>
            <option value="immediate">Immediately</option>
            <option value="two_weeks">Within 2 weeks</option>
            <option value="flexible">Flexible</option>
          </select>
        </Field>

        <Field
          label="Guardian phone number"
          help="Required if you are under 18. Used only for safety contact."
        >
          <input
            name="guardianContact"
            type="tel"
            inputMode="tel"
            placeholder="0244 123 456"
            defaultValue={existing?.guardianContact ?? ""}
            className={inputCls}
          />
        </Field>

        <Field label="Short bio (optional)">
          <textarea
            name="bio"
            rows={3}
            maxLength={500}
            defaultValue={existing?.bio ?? ""}
            placeholder="A sentence or two about you and what you're looking for."
            className={`${inputCls} resize-y`}
          />
        </Field>

        <button
          type="submit"
          className="w-full rounded-md bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--color-primary-strong)]"
        >
          Save and find work
        </button>
      </form>
    </section>
  );
}

const inputCls =
  "mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary-strong)] focus:outline-none";

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-wider text-[var(--color-muted)]">
        {label}
      </label>
      {children}
      {help && (
        <p className="mt-1 text-xs text-[var(--color-muted)]">{help}</p>
      )}
    </div>
  );
}

function SkillsInput({ defaultValue }: { defaultValue: string[] }) {
  // Comma-separated input split by the server action.
  return (
    <input
      name="skills"
      defaultValue={defaultValue.join(", ")}
      placeholder="tailoring, customer care, basic Excel"
      className={inputCls}
    />
  );
}
