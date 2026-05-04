import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { employerProfiles } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import {
  GHANA_REGIONS,
  HAZARDOUS_CATEGORIES_DEFAULT,
  JOB_CATEGORIES,
  PRIMARY_CITIES,
} from "@/lib/ghana";
import { createJobAction } from "./actions";

const inputCls =
  "mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary-strong)] focus:outline-none";

export default async function NewJobPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const session = await getSession();
  if (!session.userId || session.role === "candidate") {
    redirect("/sign-in?intent=employer");
  }

  const db = getDb();
  const [employer] = await db
    .select()
    .from(employerProfiles)
    .where(eq(employerProfiles.userId, session.userId!))
    .limit(1);
  if (!employer) redirect("/onboarding/employer");

  const isVerified = !!employer.verifiedAt;

  return (
    <section className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold sm:text-3xl">Post an opportunity</h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Posts go to <strong>pending review</strong> automatically. Verified
        employers usually clear review within 24 hours.
      </p>

      {!isVerified && (
        <div className="mt-4 rounded-md border border-[var(--color-accent)]/40 bg-[var(--color-surface)] px-3 py-2 text-sm">
          Your organisation isn&apos;t verified yet. You can still draft
          posts — they&apos;ll go live once verification completes.
        </div>
      )}
      {sp.error && (
        <div className="mt-4 rounded-md border border-[var(--color-danger)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-danger)]">
          {sp.error}
        </div>
      )}

      <form action={createJobAction} className="mt-6 space-y-5">
        <Field label="Type">
          <select name="type" required defaultValue="" className={inputCls}>
            <option value="" disabled>Choose</option>
            <option value="job">Job</option>
            <option value="apprenticeship">Apprenticeship</option>
            <option value="internship">Internship</option>
            <option value="gig">Short gig</option>
          </select>
        </Field>

        <Field label="Title">
          <input
            name="title"
            required
            placeholder="e.g. Junior tailor — full time"
            className={inputCls}
          />
        </Field>

        <Field label="Category">
          <select name="category" required defaultValue="" className={inputCls}>
            <option value="" disabled>Choose</option>
            {JOB_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            Some trades (
            {Array.from(HAZARDOUS_CATEGORIES_DEFAULT).join(", ")}) are
            classed as hazardous and automatically restricted to applicants
            18 and over.
          </p>
        </Field>

        <Field label="Description">
          <textarea
            name="description"
            required
            rows={6}
            maxLength={4000}
            placeholder="What will the person do? What hours? What benefits? Any required skills?"
            className={`${inputCls} resize-y`}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="City or town">
            <input
              name="city"
              required
              list="primary-cities"
              className={inputCls}
            />
            <datalist id="primary-cities">
              {PRIMARY_CITIES.map((c) => (
                <option key={c.city} value={c.city} />
              ))}
            </datalist>
          </Field>
          <Field label="Region">
            <select name="region" required defaultValue="" className={inputCls}>
              <option value="" disabled>Choose region</option>
              {GHANA_REGIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Pay amount (GHS)">
            <input
              type="number"
              name="payAmountGhs"
              min={0}
              placeholder="e.g. 800"
              className={inputCls}
            />
          </Field>
          <Field label="Pay period">
            <select
              name="payPeriod"
              required
              defaultValue=""
              className={inputCls}
            >
              <option value="" disabled>Choose</option>
              <option value="hour">Per hour</option>
              <option value="day">Per day</option>
              <option value="week">Per week</option>
              <option value="month">Per month</option>
              <option value="stipend">Stipend</option>
              <option value="unpaid_with_skills">
                Unpaid — provides documented skills training
              </option>
            </select>
          </Field>
        </div>

        <Field
          label="Minimum age"
          help="Default 18. Lower it (down to 15) only for safe, light, non-hazardous work that complies with the Children's Act."
        >
          <input
            type="number"
            name="minimumAge"
            min={15}
            max={65}
            defaultValue={18}
            className={inputCls}
          />
        </Field>

        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="isHazardous" className="mt-1" />
          <span>
            This work involves hazards (e.g. heavy machinery, chemicals,
            heights, late nights) and must be restricted to 18+ applicants.
          </span>
        </label>

        <fieldset className="space-y-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
          <legend className="px-1 text-xs uppercase tracking-wider text-[var(--color-muted)]">
            Apprenticeship terms — required only if type is apprenticeship
          </legend>
          <p className="text-xs text-[var(--color-muted)]">
            These terms are shown to every applicant before they apply, and
            we render them as a printable agreement once you agree on a
            placement. Be specific — vague terms cause disputes later.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Duration (months)">
              <input
                type="number"
                name="durationMonths"
                min={1}
                max={60}
                placeholder="e.g. 12"
                className={inputCls}
              />
            </Field>
            <Field label="Hours per week">
              <input
                type="number"
                name="hoursPerWeek"
                min={1}
                max={60}
                placeholder="e.g. 35"
                className={inputCls}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Daily start time">
              <input
                type="time"
                name="startTimeOfDay"
                className={inputCls}
              />
            </Field>
            <Field label="Daily end time">
              <input
                type="time"
                name="endTimeOfDay"
                className={inputCls}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Days off per week">
              <input
                type="number"
                name="daysOffPerWeek"
                min={0}
                max={7}
                defaultValue={1}
                className={inputCls}
              />
            </Field>
            <Field label="Stipend (GHS, optional)">
              <input
                type="number"
                name="stipendAmountGhs"
                min={0}
                placeholder="e.g. 200"
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="Stipend period">
            <select
              name="stipendPeriod"
              defaultValue=""
              className={inputCls}
            >
              <option value="">No stipend</option>
              <option value="week">Per week</option>
              <option value="month">Per month</option>
            </select>
          </Field>

          <Field
            label="Training topics covered"
            help="Comma-separated. What will the apprentice learn? E.g. cutting, sewing, customer measurement, machine maintenance."
          >
            <input
              name="trainingTopics"
              placeholder="cutting, sewing, customer measurement, machine maintenance"
              className={inputCls}
            />
          </Field>

          <Field
            label="What happens at completion"
            help="What does the apprentice walk away with? A certificate? Help to set up their own shop? Continued employment?"
          >
            <textarea
              name="completionOutcome"
              rows={2}
              maxLength={400}
              placeholder="On completion, apprentice receives a workshop-issued certificate of mastery and is supported to set up their own shop."
              className={`${inputCls} resize-y`}
            />
          </Field>

          <Field label="Notes for guardians (optional)">
            <textarea
              name="notesForGuardians"
              rows={2}
              maxLength={800}
              placeholder="Any specific message to a guardian who may approve an under-18 apprentice."
              className={`${inputCls} resize-y`}
            />
          </Field>

          <p className="text-xs text-[var(--color-muted)]">
            Reminder: under-18 apprentices may not work in hazardous trades,
            and may not work between 8pm and 6am, regardless of guardian
            consent. The Children&apos;s Act 1998 (Act 560) and the Hazardous
            Child Labour Activity Framework apply.
          </p>
        </fieldset>

        <button
          type="submit"
          className="w-full rounded-md bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--color-primary-strong)]"
        >
          Submit for review
        </button>
      </form>
    </section>
  );
}

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
