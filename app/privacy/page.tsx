import Link from "next/link";

export const metadata = {
  title: "Privacy notice — Ghana Youth Jobs",
};

export default function PrivacyPage() {
  return (
    <main style={{ background: "#f8fafc", minHeight: "100vh", color: "#0f172a" }}>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block h-7 w-7 rounded-md"
            style={{ background: "linear-gradient(135deg, #2aa45c, #f0b429)" }}
          />
          <span className="text-sm font-semibold">Ghana Youth Jobs</span>
        </Link>

        <article className="prose prose-slate mt-6 max-w-none rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <h1 className="!mt-0">Privacy notice</h1>
          <p className="text-sm text-slate-500">
            Last updated: 2026-05-04. This is the current operational state of
            the platform. We will revise this notice as the product evolves
            and post the date above.
          </p>

          <h2>Plain-language summary</h2>
          <ul>
            <li>We use your phone number for sign-in and to send you opportunities you opted in to.</li>
            <li>We never charge job seekers. If anyone asks for money to give you a job, report them.</li>
            <li>We never share your phone number with employers or anyone else.</li>
            <li>People under 18 need a guardian to approve their account before applying.</li>
            <li>You can download or delete your data at any time from <Link href="/settings">Settings</Link>.</li>
          </ul>

          <h2>What we collect</h2>
          <ul>
            <li><strong>From you:</strong> your phone number, full name, city, region, year of birth, education level, top skills, languages, availability, optional bio, optional guardian phone (under-18s).</li>
            <li><strong>For employers:</strong> organisation name, type, contact name, optional last 4 digits of Ghana Card, optional business registration number.</li>
            <li><strong>From your activity:</strong> jobs you apply to, messages you send, scam reports you file, and CVs we generate at your request.</li>
            <li><strong>Automatically:</strong> approximate IP address (kept only for safety actions like guardian-consent decisions), and timestamps of important events.</li>
          </ul>

          <h2>What we do with it</h2>
          <ul>
            <li>Sign you in by phone via a one-time code (OTP).</li>
            <li>Show you opportunities that match your skills and city, by SMS or in-app.</li>
            <li>Show employers your profile (without your phone number) when you apply to their jobs.</li>
            <li>Generate a CV from your profile, when you ask for one.</li>
            <li>Detect and remove scam jobs and abusive messages.</li>
          </ul>

          <h2>Who else processes your data</h2>
          <p>
            We use these third parties to run the service. Each one only sees
            what it needs.
          </p>
          <ul>
            <li><strong>Vercel</strong> (hosting, application logs) — application logs may include the URL paths you visit and short error traces.</li>
            <li><strong>Neon Postgres</strong> (database) — stores everything described above.</li>
            <li><strong>Anthropic</strong> (AI CV generation) — when you ask us to generate a CV, we send your profile fields and any rough notes you typed to Anthropic&apos;s API. We do not send your phone number. We do not allow training on your data.</li>
            <li><strong>Arkesel</strong> (SMS delivery in Ghana) — delivers OTP codes, opportunity digests, and guardian-consent links to phone numbers.</li>
            <li><strong>Future:</strong> a WhatsApp Business provider once we&apos;ve completed Meta Business onboarding. We&apos;ll update this notice before that goes live.</li>
          </ul>

          <h2>How long we keep it</h2>
          <ul>
            <li><strong>Active accounts:</strong> as long as your account exists.</li>
            <li><strong>Deleted accounts:</strong> profile, applications, messages, jobs, conversations, and generated CVs are deleted immediately when you click &quot;Delete my account&quot;. Audit log entries with no personal content are retained for accountability.</li>
            <li><strong>OTP codes:</strong> 10-minute expiry, then garbage-collected.</li>
            <li><strong>Notification logs (sent SMS digests):</strong> currently retained while the parent account exists, for de-dup and dispute resolution.</li>
          </ul>

          <h2>Your rights</h2>
          <p>
            Under Ghana&apos;s Data Protection Act 2012 (Act 843) you have
            rights including: to know what we hold about you, to correct it,
            to request deletion, and to withdraw consent. We have built these
            into the product:
          </p>
          <ul>
            <li><strong>See and edit:</strong> via your profile pages and <Link href="/settings">Settings</Link>.</li>
            <li><strong>Download:</strong> a JSON copy of your data from Settings.</li>
            <li><strong>Delete:</strong> permanently, with phone-number confirmation, from Settings.</li>
            <li><strong>Withdraw guardian consent:</strong> a candidate or guardian can revoke at any time. After revocation, the candidate can&apos;t apply for jobs until a new approval is recorded.</li>
            <li><strong>Complain:</strong> to the Ghana Data Protection Commission.</li>
          </ul>

          <h2>Children</h2>
          <p>
            People under 18 can sign up only with the approval of a parent,
            guardian, or trusted adult, captured by SMS link. We block
            applications to hazardous trades regardless of guardian
            approval. We may add stricter rules as we work with the
            Department of Social Welfare and the Ministry of Employment and
            Labour Relations.
          </p>

          <h2>Honest disclosures</h2>
          <ul>
            <li>This product is in early access. We are working toward registration with Ghana&apos;s Data Protection Commission.</li>
            <li>We do our best on security but no online service is risk-free. Don&apos;t put information here that you would not share with a stranger you respect.</li>
            <li>If we ever have a data breach affecting you, we will notify you by SMS within 72 hours, in line with current best practice.</li>
            <li>Specific provisions of Act 843 — including cross-border-transfer requirements — are evolving in regulatory guidance. We will adjust this notice as guidance changes.</li>
          </ul>

          <h2>Contact</h2>
          <p>
            Questions, corrections, or complaints: contact details will be
            published once support operations are staffed.
          </p>
        </article>
      </div>
    </main>
  );
}
