import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { employerProfiles } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { GHANA_REGIONS, PRIMARY_CITIES } from "@/lib/ghana";
import { saveEmployerProfileAction } from "./actions";

const inputCls =
  "mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary-strong)] focus:outline-none";

export default async function EmployerOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const session = await getSession();
  if (!session.userId) redirect("/sign-in?intent=employer");

  const db = getDb();
  const [existing] = await db
    .select()
    .from(employerProfiles)
    .where(eq(employerProfiles.userId, session.userId))
    .limit(1);

  return (
    <section className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold sm:text-3xl">
        Set up your employer profile
      </h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        We review every employer before your jobs go live. You can save this
        now and finish posting once we&apos;ve verified you (usually within 24
        hours).
      </p>

      {sp.error && (
        <div className="mt-4 rounded-md border border-[var(--color-danger)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-danger)]">
          {sp.error}
        </div>
      )}

      <form action={saveEmployerProfileAction} className="mt-6 space-y-5">
        <Field label="Organisation or business name">
          <input
            name="organizationName"
            required
            defaultValue={existing?.organizationName ?? ""}
            className={inputCls}
          />
        </Field>

        <Field label="Type of organisation">
          <select
            name="organizationType"
            required
            defaultValue={existing?.organizationType ?? ""}
            className={inputCls}
          >
            <option value="" disabled>Choose</option>
            <option value="company">Registered company</option>
            <option value="sole_proprietor">Sole proprietor / shop</option>
            <option value="artisan">Master artisan</option>
            <option value="training_provider">Training provider</option>
            <option value="ngo">NGO / community programme</option>
          </select>
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

        <Field label="Contact person">
          <input
            name="contactName"
            required
            defaultValue={existing?.contactName ?? ""}
            className={inputCls}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Last 4 digits of Ghana Card"
            help="Optional. Helps us verify you faster. We never store the full number."
          >
            <input
              name="ghanaCardLast4"
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              defaultValue={existing?.ghanaCardLast4 ?? ""}
              className={inputCls}
            />
          </Field>
          <Field
            label="Business reg. number"
            help="Optional. From the Office of the Registrar of Companies."
          >
            <input
              name="businessRegistrationNumber"
              defaultValue={existing?.businessRegistrationNumber ?? ""}
              className={inputCls}
            />
          </Field>
        </div>

        <Field label="About your organisation">
          <textarea
            name="description"
            rows={4}
            maxLength={800}
            defaultValue={existing?.description ?? ""}
            placeholder="What do you do? Where? How many people work here?"
            className={`${inputCls} resize-y`}
          />
        </Field>

        <button
          type="submit"
          className="w-full rounded-md bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--color-primary-strong)]"
        >
          Save profile
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
