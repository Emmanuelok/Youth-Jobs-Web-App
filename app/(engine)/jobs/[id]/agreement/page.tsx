import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  applications,
  apprenticeshipTerms,
  candidateProfiles,
  employerProfiles,
  jobs,
} from "@/db/schema";
import { getSession } from "@/lib/auth/session";

/**
 * Printable apprenticeship agreement.
 *
 * Visible to:
 *   - The job's employer
 *   - Any candidate who has an application to this job
 *   - Admin
 *
 * NOT a legally binding contract on its own. We render the structured terms
 * the employer captured at post time, plus the candidate's name and the date
 * of acknowledgment, in a clean printable layout. A Ghanaian lawyer must
 * review the wording (TVET Act 1023, Children's Act 560, Labour Act 651)
 * before this is treated as enforceable.
 */
export default async function ApprenticeshipAgreementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session.userId) redirect("/sign-in");

  const db = getDb();
  const [job] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  if (!job) notFound();
  if (job.type !== "apprenticeship") notFound();

  const [terms] = await db
    .select()
    .from(apprenticeshipTerms)
    .where(eq(apprenticeshipTerms.jobId, job.id))
    .limit(1);
  if (!terms) notFound();

  const [employer] = await db
    .select()
    .from(employerProfiles)
    .where(eq(employerProfiles.userId, job.employerId))
    .limit(1);

  const isEmployer = job.employerId === session.userId;

  // Allow the candidate iff they have an application here.
  let myApplication: typeof applications.$inferSelect | undefined;
  if (!isEmployer && session.role !== "admin") {
    const [app] = await db
      .select()
      .from(applications)
      .where(
        and(
          eq(applications.jobId, job.id),
          eq(applications.candidateId, session.userId!),
        ),
      )
      .limit(1);
    if (!app) notFound();
    myApplication = app;
  }

  const [candidate] = myApplication
    ? await db
        .select()
        .from(candidateProfiles)
        .where(eq(candidateProfiles.userId, myApplication.candidateId))
        .limit(1)
    : [undefined];

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="no-print mb-4 flex items-center justify-between">
        <Link
          href={`/jobs/${job.id}`}
          className="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)]"
        >
          ← Back to opportunity
        </Link>
        <p className="text-xs text-[var(--color-muted)]">
          Use your browser&apos;s Print menu (Ctrl/⌘+P) to save as PDF.
        </p>
      </div>

      <article className="agreement">
        <header className="agreement-header">
          <h1>Apprenticeship agreement</h1>
          <p className="agreement-sub">
            Issued via Ghana Youth Jobs · {new Date().toLocaleDateString()}
          </p>
        </header>

        <Section title="Parties">
          <dl>
            <Row label="Master / employer">
              <strong>{employer?.organizationName ?? "Employer"}</strong>
              {employer?.verifiedAt && " (verified)"}
              <br />
              {employer?.city}, {employer?.region}
              <br />
              Contact: {employer?.contactName}
            </Row>
            {candidate && (
              <Row label="Apprentice">
                <strong>{candidate.fullName}</strong>
                <br />
                {candidate.city}, {candidate.region}
                <br />
                Languages: {candidate.languages.join(", ") || "—"}
              </Row>
            )}
          </dl>
        </Section>

        <Section title="Opportunity">
          <dl>
            <Row label="Title">{job.title}</Row>
            <Row label="Trade / category">{job.category}</Row>
            <Row label="Location">{job.city}, {job.region}</Row>
            <Row label="Minimum age">{job.minimumAge}</Row>
          </dl>
          <p className="agreement-desc">{job.description}</p>
        </Section>

        <Section title="Terms">
          <dl className="grid">
            <Row label="Duration">{terms.durationMonths} months</Row>
            <Row label="Hours per week">{terms.hoursPerWeek} hours</Row>
            <Row label="Daily schedule">
              {terms.startTimeOfDay} – {terms.endTimeOfDay}
            </Row>
            <Row label="Days off per week">{terms.daysOffPerWeek}</Row>
            <Row label="Stipend">
              {terms.stipendAmountGhs && terms.stipendPeriod
                ? `GHS ${terms.stipendAmountGhs.toLocaleString()} per ${terms.stipendPeriod}`
                : "No stipend"}
            </Row>
          </dl>
        </Section>

        <Section title="Training topics">
          <ul className="agreement-list">
            {terms.trainingTopics.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </Section>

        <Section title="On completion">
          <p>{terms.completionOutcome}</p>
        </Section>

        {terms.notesForGuardians && (
          <Section title="Note for guardians">
            <p>{terms.notesForGuardians}</p>
          </Section>
        )}

        <Section title="Statutory protections">
          <ul className="agreement-list">
            <li>The apprentice will not be charged any fee to take up this placement.</li>
            <li>If the apprentice is under 18, they will not work between 8pm and 6am or in any hazardous trade, regardless of any term above.</li>
            <li>Either party may end the placement with reasonable notice. Disputes are referred to the Department of Social Welfare or other appropriate authority.</li>
            <li>Ghana Youth Jobs is not a party to this agreement and assumes no employment liability. Verification reduces but does not eliminate risk.</li>
            <li>This agreement is subject to the Children&apos;s Act 1998 (Act 560), the Labour Act 2003 (Act 651), and the TVET Act 2020 (Act 1023). A qualified Ghanaian lawyer should review before treating any term as enforceable.</li>
          </ul>
        </Section>

        {myApplication && (
          <Section title="Acknowledgment">
            <p>
              {candidate?.fullName ?? "Apprentice"} acknowledged these terms
              when applying on{" "}
              {myApplication.acknowledgedTermsAt
                ? new Date(myApplication.acknowledgedTermsAt).toLocaleString()
                : "—"}
              .
            </p>
          </Section>
        )}

        <footer className="agreement-sign">
          <div className="agreement-sign-row">
            <div className="agreement-sign-line">
              <span>Signed (master / employer)</span>
              <span>Date</span>
            </div>
            <div className="agreement-sign-line">
              <span>Signed (apprentice)</span>
              <span>Date</span>
            </div>
            <div className="agreement-sign-line">
              <span>Signed (guardian, if apprentice is under 18)</span>
              <span>Date</span>
            </div>
          </div>
        </footer>
      </article>

      <style>{`
        .agreement {
          background: #ffffff;
          color: #111827;
          padding: 32px 36px;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          font-family: ui-serif, Georgia, "Times New Roman", serif;
          line-height: 1.55;
        }
        .agreement h1 { margin: 0; font-size: 26px; }
        .agreement .agreement-sub {
          margin: 4px 0 0;
          font-size: 12px;
          color: #6b7280;
        }
        .agreement section { margin-top: 22px; }
        .agreement h2 {
          margin: 0 0 8px;
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #6b7280;
          font-family: ui-sans-serif, system-ui, sans-serif;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 4px;
        }
        .agreement dl { margin: 0; }
        .agreement dl.grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 6px 12px;
        }
        .agreement .row { display: flex; justify-content: space-between; gap: 12px; padding: 4px 0; font-size: 13px; }
        .agreement .row dt { color: #6b7280; }
        .agreement .row dd { margin: 0; text-align: right; max-width: 60%; }
        .agreement .agreement-desc { margin-top: 8px; white-space: pre-line; font-size: 13px; }
        .agreement .agreement-list { margin: 0; padding-left: 18px; font-size: 13px; }
        .agreement .agreement-list li { margin-bottom: 3px; }
        .agreement-sign { margin-top: 32px; }
        .agreement-sign-row { display: grid; grid-template-columns: 1fr; gap: 24px; }
        .agreement-sign-line {
          border-top: 1px solid #4b5563;
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: #6b7280;
          padding-top: 4px;
        }
        @media print {
          body { background: #ffffff !important; }
          .no-print { display: none !important; }
          .agreement {
            border: none;
            border-radius: 0;
            padding: 0;
          }
        }
      `}</style>
    </section>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
