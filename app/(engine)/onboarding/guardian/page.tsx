import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { candidateProfiles, users } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { latestConsent } from "@/lib/consent";
import { requestGuardianConsentAction } from "./actions";

const inputCls =
  "mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary-strong)] focus:outline-none";

export default async function GuardianOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; flash?: string }>;
}) {
  const sp = await searchParams;
  const session = await getSession();
  if (!session.userId) redirect("/sign-in?intent=candidate");

  const db = getDb();
  const [u] = await db
    .select({ isUnder18: users.isUnder18 })
    .from(users)
    .where(eq(users.id, session.userId!))
    .limit(1);

  if (!u?.isUnder18) {
    redirect(sp.next ?? "/jobs");
  }

  const [profile] = await db
    .select({
      fullName: candidateProfiles.fullName,
      guardianContact: candidateProfiles.guardianContact,
    })
    .from(candidateProfiles)
    .where(eq(candidateProfiles.userId, session.userId!))
    .limit(1);
  if (!profile) redirect("/onboarding/candidate");

  const consent = await latestConsent(session.userId!);
  const next = sp.next ?? "/jobs";

  return (
    <section className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold sm:text-3xl">
        Guardian approval
      </h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Because you&apos;re under 18, we ask a parent, guardian, or trusted
        adult to approve your sign-up before you can apply for jobs. They
        only need to tap a link we&apos;ll send by SMS — they don&apos;t have
        to download anything.
      </p>

      {sp.flash && (
        <div className="mt-4 rounded-md border border-[var(--color-primary-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm">
          {sp.flash}
        </div>
      )}
      {sp.error && (
        <div className="mt-4 rounded-md border border-[var(--color-danger)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-danger)]">
          {sp.error}
        </div>
      )}

      {consent && (
        <ConsentStatusCard consent={consent} next={next} />
      )}

      <form
        action={requestGuardianConsentAction}
        className="mt-6 space-y-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
      >
        <input type="hidden" name="next" value={next} />

        <Field label="Guardian's full name">
          <input
            name="guardianName"
            required
            placeholder="e.g. Ama Mensah"
            className={inputCls}
          />
        </Field>

        <Field label="Their relationship to you">
          <select
            name="guardianRelation"
            required
            defaultValue=""
            className={inputCls}
          >
            <option value="" disabled>Choose</option>
            <option value="parent">Parent</option>
            <option value="guardian">Legal guardian</option>
            <option value="family_member">Family member</option>
            <option value="community_leader">
              Community leader / pastor / imam / teacher
            </option>
          </select>
        </Field>

        <Field
          label="Guardian's phone number"
          help="We'll send them one SMS with the approval link. Standard SMS rates may apply."
        >
          <input
            name="guardianPhone"
            type="tel"
            inputMode="tel"
            required
            placeholder="0244 123 456"
            defaultValue={profile.guardianContact ?? ""}
            className={inputCls}
          />
        </Field>

        <button
          type="submit"
          className="w-full rounded-md bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--color-primary-strong)]"
        >
          {consent ? "Send a new approval link" : "Send approval link"}
        </button>

        <p className="text-xs text-[var(--color-muted)]">
          We only contact your guardian about your account safety. We never
          share their number with employers.
        </p>
      </form>
    </section>
  );
}

function ConsentStatusCard({
  consent,
  next,
}: {
  consent: {
    decision: string | null;
    decisionAt: Date | null;
    requestedAt: Date;
    expiresAt: Date;
    guardianName: string;
    refusalReason: string | null;
  };
  next: string;
}) {
  if (consent.decision === "approved") {
    return (
      <div className="mt-6 rounded-lg border border-[var(--color-primary-strong)] bg-[var(--color-surface)] p-4">
        <p className="text-sm font-semibold text-[var(--color-primary-strong)]">
          ✓ Approved by {consent.guardianName}
        </p>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          {consent.decisionAt
            ? `On ${new Date(consent.decisionAt).toLocaleDateString()}.`
            : ""}{" "}
          You can apply for opportunities now.
        </p>
        <a
          href={next}
          className="mt-3 inline-block rounded-md bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--color-primary-strong)]"
        >
          Continue
        </a>
      </div>
    );
  }
  if (consent.decision === "refused") {
    return (
      <div className="mt-6 rounded-lg border border-[var(--color-danger)] bg-[var(--color-surface)] p-4">
        <p className="text-sm font-semibold text-[var(--color-danger)]">
          {consent.guardianName} refused this request
        </p>
        {consent.refusalReason && (
          <p className="mt-1 text-sm">{consent.refusalReason}</p>
        )}
        <p className="mt-2 text-xs text-[var(--color-muted)]">
          You can talk it over with them and request again, or pick a
          different guardian below.
        </p>
      </div>
    );
  }
  // Pending
  const expired = new Date(consent.expiresAt).getTime() < Date.now();
  return (
    <div className="mt-6 rounded-lg border border-[var(--color-accent)]/40 bg-[var(--color-surface)] p-4">
      <p className="text-sm font-semibold text-[var(--color-accent)]">
        {expired ? "Previous link expired" : "Waiting for approval"}
      </p>
      <p className="mt-1 text-xs text-[var(--color-muted)]">
        SMS was sent to {consent.guardianName} on{" "}
        {new Date(consent.requestedAt).toLocaleDateString()}. If they
        haven&apos;t received it, send a new link below.
      </p>
    </div>
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
