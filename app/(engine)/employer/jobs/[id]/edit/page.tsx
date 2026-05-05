import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { apprenticeshipTerms, jobs } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import {
  GHANA_REGIONS,
  HAZARDOUS_CATEGORIES_DEFAULT,
  JOB_CATEGORIES,
  PRIMARY_CITIES,
} from "@/lib/ghana";
import { updateJobAction } from "./actions";

const inputCls =
  "mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary-strong)] focus:outline-none";

export default async function EditJobPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const session = await getSession();
  if (!session.userId) redirect("/sign-in?intent=employer");

  const db = getDb();
  const [job] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  if (!job) notFound();
  if (session.role !== "admin" && job.employerId !== session.userId) {
    redirect("/employer");
  }
  if (job.status === "closed") {
    redirect("/employer");
  }

  const [terms] = job.type === "apprenticeship"
    ? await db
        .select()
        .from(apprenticeshipTerms)
        .where(eq(apprenticeshipTerms.jobId, id))
        .limit(1)
    : [undefined];

  const willResubmit =
    job.status === "published" || job.status === "rejected";

  return (
    <section className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link
        href={`/employer/jobs/${id}`}
        className="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)]"
      >
        ← Back to opportunity
      </Link>
      <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">Edit post</h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Update any details below. Current status:{" "}
        <strong>{job.status.replace("_", " ")}</strong>.
      </p>

      {willResubmit && (
        <div className="mt-4 rounded-md border border-[var(--color-accent)]/40 bg-[var(--color-surface)] px-3 py-2 text-sm">
          Saving will return this post to <strong>pending review</strong>{" "}
          until an admin re-approves it. Existing applicants are unaffected.
        </div>
      )}
      {sp.error && (
        <div className="mt-4 rounded-md border border-[var(--color-danger)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-danger)]">
          {sp.error}
        </div>
      )}

      <form action={updateJobAction} className="mt-6 space-y-5">
        <input type="hidden" name="jobId" value={job.id} />

        <Field label="Type">
          <select
            name="type"
            required
            defaultValue={job.type}
            className={inputCls}
          >
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
            defaultValue={job.title}
            className={inputCls}
          />
        </Field>

        <Field label="Category">
          <select
            name="category"
            required
            defaultValue={job.category}
            className={inputCls}
          >
            <option value="" disabled>Choose</option>
            {JOB_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            Hazardous trades ({Array.from(HAZARDOUS_CATEGORIES_DEFAULT).join(", ")}) are restricted to 18+.
          </p>
        </Field>

        <Field label="Description">
          <textarea
            name="description"
            required
            rows={6}
            maxLength={4000}
            defaultValue={job.description}
            className={`${inputCls} resize-y`}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="City or town">
            <input
              name="city"
              required
              list="primary-cities"
              defaultValue={job.city}
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
              defaultValue={job.region}
              className={inputCls}
            >
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
              defaultValue={job.payAmountGhs ?? ""}
              className={inputCls}
            />
          </Field>
          <Field label="Pay period">
            <select
              name="payPeriod"
              required
              defaultValue={job.payPeriod}
              className={inputCls}
            >
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

        <Field label="Minimum age">
          <input
            type="number"
            name="minimumAge"
            min={15}
            max={65}
            defaultValue={job.minimumAge}
            className={inputCls}
          />
        </Field>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="isHazardous"
            defaultChecked={job.isHazardous}
            className="mt-1"
          />
          <span>
            This work involves hazards (heavy machinery, chemicals, heights,
            late nights). Restricted to 18+.
          </span>
        </label>

        {job.type === "apprenticeship" && (
          <fieldset className="space-y-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
            <legend className="px-1 text-xs uppercase tracking-wider text-[var(--color-muted)]">
              Apprenticeship terms
            </legend>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Duration (months)">
                <input
                  type="number"
                  name="durationMonths"
                  min={1}
                  max={60}
                  defaultValue={terms?.durationMonths ?? ""}
                  className={inputCls}
                />
              </Field>
              <Field label="Hours per week">
                <input
                  type="number"
                  name="hoursPerWeek"
                  min={1}
                  max={60}
                  defaultValue={terms?.hoursPerWeek ?? ""}
                  className={inputCls}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Daily start time">
                <input
                  type="time"
                  name="startTimeOfDay"
                  defaultValue={terms?.startTimeOfDay ?? ""}
                  className={inputCls}
                />
              </Field>
              <Field label="Daily end time">
                <input
                  type="time"
                  name="endTimeOfDay"
                  defaultValue={terms?.endTimeOfDay ?? ""}
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
                  defaultValue={terms?.daysOffPerWeek ?? 1}
                  className={inputCls}
                />
              </Field>
              <Field label="Stipend (GHS, optional)">
                <input
                  type="number"
                  name="stipendAmountGhs"
                  min={0}
                  defaultValue={terms?.stipendAmountGhs ?? ""}
                  className={inputCls}
                />
              </Field>
            </div>

            <Field label="Stipend period">
              <select
                name="stipendPeriod"
                defaultValue={terms?.stipendPeriod ?? ""}
                className={inputCls}
              >
                <option value="">No stipend</option>
                <option value="week">Per week</option>
                <option value="month">Per month</option>
              </select>
            </Field>

            <Field label="Training topics covered">
              <input
                name="trainingTopics"
                defaultValue={(terms?.trainingTopics ?? []).join(", ")}
                placeholder="cutting, sewing, customer measurement"
                className={inputCls}
              />
            </Field>

            <Field label="What happens at completion">
              <textarea
                name="completionOutcome"
                rows={2}
                maxLength={400}
                defaultValue={terms?.completionOutcome ?? ""}
                className={`${inputCls} resize-y`}
              />
            </Field>

            <Field label="Notes for guardians (optional)">
              <textarea
                name="notesForGuardians"
                rows={2}
                maxLength={800}
                defaultValue={terms?.notesForGuardians ?? ""}
                className={`${inputCls} resize-y`}
              />
            </Field>
          </fieldset>
        )}

        <button
          type="submit"
          className="w-full rounded-md bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--color-primary-strong)]"
        >
          {willResubmit ? "Save and resubmit for review" : "Save changes"}
        </button>
      </form>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-wider text-[var(--color-muted)]">
        {label}
      </label>
      {children}
    </div>
  );
}
