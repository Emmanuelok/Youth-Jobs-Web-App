import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  candidateProfiles,
  employerProfiles,
  users,
} from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { latestConsent } from "@/lib/consent";
import {
  deleteMyAccountAction,
  revokeMyConsentAction,
} from "./actions";

const inputCls =
  "mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary-strong)] focus:outline-none";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; flash?: string }>;
}) {
  const sp = await searchParams;
  const session = await getSession();
  if (!session.userId) redirect("/sign-in");

  const db = getDb();
  const [u] = await db
    .select({
      id: users.id,
      phone: users.phone,
      role: users.primaryRole,
      isUnder18: users.isUnder18,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, session.userId!))
    .limit(1);
  if (!u) redirect("/sign-in");

  const [candidate] = u.role === "candidate"
    ? await db
        .select({ fullName: candidateProfiles.fullName })
        .from(candidateProfiles)
        .where(eq(candidateProfiles.userId, u.id))
        .limit(1)
    : [undefined];
  const [employer] = u.role === "employer"
    ? await db
        .select({ organizationName: employerProfiles.organizationName })
        .from(employerProfiles)
        .where(eq(employerProfiles.userId, u.id))
        .limit(1)
    : [undefined];

  const consent = u.isUnder18 ? await latestConsent(u.id) : null;

  return (
    <section className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold sm:text-3xl">Settings</h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Manage your account, download your data, and control consent.
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

      <div className="mt-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm">
        <p className="text-xs uppercase tracking-wider text-[var(--color-muted)]">
          Account
        </p>
        <dl className="mt-2 space-y-1">
          <Row label="Phone">{u.phone}</Row>
          <Row label="Role">{u.role}</Row>
          {candidate && <Row label="Name">{candidate.fullName}</Row>}
          {employer && <Row label="Organisation">{employer.organizationName}</Row>}
          <Row label="Account created">
            {new Date(u.createdAt).toLocaleDateString()}
          </Row>
          {u.isUnder18 && <Row label="Under 18">yes — guardian approval applies</Row>}
        </dl>
        {(u.role === "candidate" || u.role === "employer") && (
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={
                u.role === "candidate"
                  ? "/onboarding/candidate"
                  : "/onboarding/employer"
              }
              className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs hover:border-[var(--color-primary-strong)]"
            >
              Edit {u.role === "candidate" ? "my profile" : "organisation profile"}
            </a>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <p className="text-xs uppercase tracking-wider text-[var(--color-muted)]">
          Download my data
        </p>
        <p className="mt-2 text-sm">
          Get a JSON file containing every piece of personal data we hold
          about you — profile, applications, messages you sent, generated
          CVs, consent history.
        </p>
        <a
          href="/api/me/export"
          className="mt-3 inline-block rounded-md border border-[var(--color-border)] px-4 py-2 text-sm font-semibold hover:border-[var(--color-primary-strong)]"
        >
          Download my data (JSON)
        </a>
      </div>

      {u.isUnder18 && consent?.decision === "approved" && (
        <form
          action={revokeMyConsentAction}
          className="mt-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
        >
          <p className="text-xs uppercase tracking-wider text-[var(--color-muted)]">
            Guardian approval
          </p>
          <p className="mt-2 text-sm">
            Approved by <strong>{consent.guardianName}</strong> on{" "}
            {consent.decisionAt
              ? new Date(consent.decisionAt).toLocaleDateString()
              : "—"}
            . You can revoke this any time. After revoking, you won&apos;t be
            able to apply for jobs until a guardian approves again.
          </p>
          <label className="mt-3 block text-xs uppercase tracking-wider text-[var(--color-muted)]">
            Reason (optional)
          </label>
          <input
            name="reason"
            maxLength={400}
            placeholder="Why are you revoking?"
            className={inputCls}
          />
          <button
            type="submit"
            className="mt-3 rounded-md border border-[var(--color-danger)] px-4 py-2 text-sm font-semibold text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
          >
            Revoke guardian approval
          </button>
        </form>
      )}

      <form
        action={deleteMyAccountAction}
        className="mt-6 rounded-lg border border-[var(--color-danger)] bg-[var(--color-surface)] p-4"
      >
        <p className="text-xs uppercase tracking-wider text-[var(--color-danger)]">
          Delete my account
        </p>
        <p className="mt-2 text-sm">
          This is final. We delete your profile, applications, messages,
          generated CVs, and any jobs you have posted. Audit log entries
          (e.g. records that an admin verified or rejected you) are kept
          without your name attached, as required for accountability.
          Anonymised aggregates may remain.
        </p>
        <label className="mt-3 block text-xs uppercase tracking-wider text-[var(--color-muted)]">
          Type your full phone number to confirm
        </label>
        <input
          name="confirmPhone"
          type="tel"
          inputMode="tel"
          required
          placeholder={u.phone}
          className={inputCls}
        />
        <label className="mt-3 block text-xs uppercase tracking-wider text-[var(--color-muted)]">
          Why are you leaving? (optional, helps us improve)
        </label>
        <input
          name="reason"
          maxLength={400}
          className={inputCls}
        />
        <button
          type="submit"
          className="mt-3 w-full rounded-md bg-[var(--color-danger)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--color-danger)]/90"
        >
          Permanently delete my account
        </button>
      </form>

      <p className="mt-8 text-xs text-[var(--color-muted)]">
        See our{" "}
        <a href="/privacy" className="underline hover:text-[var(--color-text)]">
          privacy notice
        </a>{" "}
        for how we handle your data, and our{" "}
        <a href="/terms" className="underline hover:text-[var(--color-text)]">
          terms
        </a>{" "}
        for the rules that keep this platform safe.
      </p>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <dt className="text-[var(--color-muted)]">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
