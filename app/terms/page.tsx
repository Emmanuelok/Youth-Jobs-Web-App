import Link from "next/link";

export const metadata = {
  title: "Terms — Ghana Youth Jobs",
};

export default function TermsPage() {
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
          <h1 className="!mt-0">Terms of use</h1>
          <p className="text-sm text-slate-500">
            Last updated: 2026-05-04. By using Ghana Youth Jobs you agree to
            these rules. We will revise them as the product evolves.
          </p>

          <h2>What this is</h2>
          <p>
            Ghana Youth Jobs is a marketplace connecting young people in Ghana
            with verified employers, master artisans, training providers, and
            community programmes. We do not employ anyone ourselves and we do
            not guarantee any specific outcome.
          </p>

          <h2>The promises that hold this together</h2>
          <ul>
            <li><strong>Free for job seekers — always.</strong> You will never be charged to apply, to be matched, or to be interviewed. Anyone asking you for money to get a job through this platform is committing fraud and we will remove them.</li>
            <li><strong>No phone number sharing.</strong> Your phone number is for sign-in and SMS opt-ins only. We never show it to other users.</li>
            <li><strong>No invented opportunities.</strong> Employers must be reviewed before their first post goes live.</li>
            <li><strong>No exploitation of minors.</strong> People under 18 must have guardian approval to apply, and are blocked from hazardous trades.</li>
          </ul>

          <h2>Rules for everyone</h2>
          <ul>
            <li>Don&apos;t pretend to be someone you&apos;re not.</li>
            <li>Don&apos;t post content that is fraudulent, illegal, abusive, discriminatory, or sexually exploitative.</li>
            <li>Don&apos;t ask for OTP codes, PIN numbers, or money in messages. We block these patterns automatically and review them with humans.</li>
            <li>Don&apos;t pressure other users to leave the platform to continue communication. We provide an in-app messaging system precisely so a record exists.</li>
            <li>Don&apos;t scrape or automate the service without our written permission.</li>
          </ul>

          <h2>Rules for employers and master artisans</h2>
          <ul>
            <li>You may not charge applicants any fee. Period. Not for &quot;registration&quot;, not for &quot;training material&quot;, not for &quot;uniforms&quot;, not for anything.</li>
            <li>You may not post jobs that violate Ghana&apos;s labour or child protection laws. Specifically: hazardous work for under-18s is forbidden, regardless of guardian consent.</li>
            <li>You must accurately describe pay, hours, location, and the nature of the work.</li>
            <li>If an applicant under 18 is hired, you must comply with applicable law on minimum age, working hours, education, and rest periods. We will require an apprenticeship agreement template before this is fully supported.</li>
            <li>Account verification is required before posts go live. We may revoke verification at any time if we receive credible reports.</li>
          </ul>

          <h2>Rules for candidates</h2>
          <ul>
            <li>Don&apos;t apply for work that isn&apos;t safe or legal for you. If you&apos;re under 18, talk to a trusted adult before sending money or visiting an unfamiliar location.</li>
            <li>Be honest in your profile. Fabricated experience hurts you and undermines other users&apos; trust in the platform.</li>
            <li>Report scams when you see them, even if you didn&apos;t fall for them. We act on patterns.</li>
          </ul>

          <h2>Account suspension and termination</h2>
          <p>
            We may suspend or terminate any account that breaks these rules.
            For serious safety incidents, we may share information with the
            police, the Department of Social Welfare, or other relevant
            authorities, in accordance with Ghana law.
          </p>

          <h2>Disclaimers</h2>
          <ul>
            <li>We are an early product and outages will happen. We will do our best.</li>
            <li>Verification reduces but does not eliminate risk. Always meet first interviews in a public place during the day, and tell a trusted person where you are going.</li>
            <li>Nothing on this platform is legal advice.</li>
          </ul>

          <h2>Updates to these terms</h2>
          <p>
            We will post the date of the latest revision at the top of this
            page. Material changes will also be announced in-app and by SMS to
            users who opted in.
          </p>
        </article>
      </div>
    </main>
  );
}
