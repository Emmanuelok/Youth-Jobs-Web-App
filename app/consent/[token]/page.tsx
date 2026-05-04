import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  candidateProfiles,
  guardianConsents,
} from "@/db/schema";
import { getSetupErrors } from "@/lib/setup";
import { decideConsentAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function GuardianConsentPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;

  const setupErrors = getSetupErrors();
  if (setupErrors.length > 0) {
    return <SetupBlocker reasons={setupErrors} />;
  }

  const db = getDb();
  const [row] = await db
    .select()
    .from(guardianConsents)
    .where(eq(guardianConsents.token, token))
    .limit(1);

  if (!row) return <Page><Block title="Link not recognised">This consent link doesn&apos;t match anything in our system. Please use the exact link from your SMS.</Block></Page>;
  if (row.revokedAt) return <Page><Block title="This request was cancelled">The young person who requested this approval cancelled it. No action is needed from you.</Block></Page>;

  const expired = row.expiresAt.getTime() < Date.now();
  const decided = !!row.decisionAt;

  const [profile] = await db
    .select({
      fullName: candidateProfiles.fullName,
      city: candidateProfiles.city,
      region: candidateProfiles.region,
      yearOfBirth: candidateProfiles.yearOfBirth,
    })
    .from(candidateProfiles)
    .where(eq(candidateProfiles.userId, row.candidateId))
    .limit(1);

  const candidateAge = profile
    ? new Date().getFullYear() - profile.yearOfBirth
    : null;

  if (sp.done) {
    return (
      <Page>
        <Block title={`Thank you, ${row.guardianName}`}>
          Your decision has been saved.{" "}
          {row.decision === "approved" ? (
            <>
              {profile?.fullName ?? "The young person"} can now apply for jobs
              and apprenticeships through Ghana Youth Jobs.
            </>
          ) : (
            <>
              {profile?.fullName ?? "The young person"} will not be able to
              apply for jobs through this account. They can talk to you and
              try again later if you&apos;d like to change your decision.
            </>
          )}
        </Block>
      </Page>
    );
  }

  if (decided) {
    return (
      <Page>
        <Block title="Already decided">
          This request was {row.decision} on{" "}
          {new Date(row.decisionAt!).toLocaleDateString()}. If you&apos;d like
          to change it, please contact support.
        </Block>
      </Page>
    );
  }

  if (expired) {
    return (
      <Page>
        <Block title="This link has expired">
          The young person can send you a new link from their account. Links
          expire after 14 days for safety.
        </Block>
      </Page>
    );
  }

  return (
    <Page>
      <h1 className="text-2xl font-semibold">Approve {profile?.fullName ?? "this young person"}</h1>
      <p className="mt-2 text-sm text-slate-600">
        You&apos;ve been listed as the <strong>{row.guardianRelation.replace("_", " ")}</strong>{" "}
        of {profile?.fullName ?? "this young person"}
        {candidateAge !== null && <> (age {candidateAge})</>}
        {profile?.city && <> in {profile.city}, {profile.region}</>}.
      </p>

      <h2 className="mt-6 text-sm font-semibold uppercase tracking-wider text-slate-500">
        What you&apos;re approving
      </h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
        <li>They can search and apply for jobs, apprenticeships, internships, and short gigs on the platform.</li>
        <li>Employers can see their first name, city, region, education level, top skills, languages, and whether they are under 18 — but never their phone number.</li>
        <li>We never charge them to apply. If anyone asks them for money to give a job, we remove that employer.</li>
        <li>People under 18 are blocked from hazardous trades (welding, construction, heavy machinery, late-night work).</li>
        <li>They can change their mind, and you can revoke this approval at any time by replying to support.</li>
      </ul>

      <h2 className="mt-6 text-sm font-semibold uppercase tracking-wider text-slate-500">
        What you should know
      </h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
        <li>You will not be charged anything. Job seekers never pay.</li>
        <li>Standard SMS rates may apply if we send you safety updates.</li>
        <li>You can refuse below — no harm done. They can pick a different guardian and try again.</li>
      </ul>

      {sp.error && (
        <div className="mt-4 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {humanError(sp.error)}
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <form action={decideConsentAction}>
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="decision" value="approved" />
          <button
            type="submit"
            className="w-full rounded-md bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            I approve
          </button>
        </form>
        <form action={decideConsentAction} className="rounded-md border border-rose-200 bg-rose-50 p-3">
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="decision" value="refused" />
          <label className="block text-[10px] uppercase tracking-wider text-rose-700">
            Reason (optional)
          </label>
          <input
            name="refusalReason"
            maxLength={400}
            placeholder="e.g. They are still in school"
            className="mt-1 w-full rounded-md border border-rose-200 bg-white px-2 py-1.5 text-sm"
          />
          <button
            type="submit"
            className="mt-2 w-full rounded-md border border-rose-600 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
          >
            I refuse
          </button>
        </form>
      </div>
    </Page>
  );
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ background: "#f8fafc", minHeight: "100vh", color: "#0f172a" }}>
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <header className="mb-6 flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block h-7 w-7 rounded-md"
            style={{ background: "linear-gradient(135deg, #2aa45c, #f0b429)" }}
          />
          <span className="text-sm font-semibold">Ghana Youth Jobs</span>
        </header>
        <article className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          {children}
        </article>
        <p className="mt-6 text-center text-xs text-slate-500">
          We never charge job seekers. If something feels wrong, reply STOP to
          our SMS or contact support.
        </p>
      </div>
    </main>
  );
}

function Block({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-slate-600">{children}</p>
    </>
  );
}

function humanError(code: string): string {
  switch (code) {
    case "not_found":
      return "This link doesn't match anything in our system.";
    case "revoked":
      return "This request was cancelled by the young person.";
    case "already_decided":
      return "This request was already decided.";
    case "expired":
      return "This link has expired.";
    default:
      return "Something went wrong. Please try again.";
  }
}

function SetupBlocker({ reasons }: { reasons: string[] }) {
  return (
    <Page>
      <Block title="Service is being set up">
        Please try again later. ({reasons.join("; ")})
      </Block>
    </Page>
  );
}
