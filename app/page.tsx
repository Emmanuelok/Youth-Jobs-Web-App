const cities = [
  "Accra",
  "Kumasi",
  "Tamale",
  "Takoradi",
  "Cape Coast",
  "Ho",
  "Koforidua",
  "Sunyani",
  "Wa",
  "Bolgatanga",
];

const categories = [
  {
    title: "Jobs",
    desc: "Entry-level and full-time roles in retail, office, hospitality, logistics and more.",
  },
  {
    title: "Apprenticeships",
    desc: "Learn a trade with a verified master — tailoring, mechanics, hairdressing, welding, catering.",
  },
  {
    title: "Internships",
    desc: "Structured internships from employers who pay or provide real learning, not unpaid labour.",
  },
  {
    title: "Gigs",
    desc: "Short-term paid work near you — events, deliveries, farm work, market support.",
  },
  {
    title: "Training",
    desc: "Verified short courses and TVET programmes that lead to real placements.",
  },
];

const trustPillars = [
  {
    title: "Verified employers and artisans",
    desc: "Every employer and master is reviewed before they can post. Verified accounts carry a clear badge.",
  },
  {
    title: "Free for job seekers — always",
    desc: "We never charge youth a fee to apply. If anyone asks you for money to get a job, report it.",
  },
  {
    title: "Scam reports handled fast",
    desc: "One tap to flag a suspicious post. Our moderators review reports within 24 hours and remove bad actors.",
  },
  {
    title: "Extra protection for under-18s",
    desc: "Stricter rules for minors: no hazardous work, guardian awareness, and safer apprenticeship terms.",
  },
];

const audiences = [
  "SHS graduates looking for first jobs",
  "University and polytechnic students seeking internships",
  "Young women looking for safe apprenticeships",
  "Trade learners — tailors, mechanics, hairdressers, welders",
  "Digital-skills learners and freelancers",
  "Small businesses and shops hiring staff",
  "Master artisans recruiting apprentices",
  "Training centres and NGOs tracking outcomes",
];

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Top bar */}
      <header className="border-b border-[var(--color-border)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block h-7 w-7 rounded-md"
              style={{
                background:
                  "linear-gradient(135deg, var(--color-primary-strong), var(--color-accent))",
              }}
            />
            <span className="text-sm font-semibold tracking-wide sm:text-base">
              Ghana Youth Jobs
            </span>
            <span className="ml-2 hidden rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[var(--color-muted)] sm:inline-block">
              Preview
            </span>
          </div>
          <nav className="flex items-center gap-3 text-sm text-[var(--color-muted)]">
            <a
              href="#trust"
              className="hidden hover:text-[var(--color-text)] sm:inline"
            >
              Trust
            </a>
            <a
              href="#audiences"
              className="hidden hover:text-[var(--color-text)] sm:inline"
            >
              Who it&apos;s for
            </a>
            <a
              href="https://github.com/Emmanuelok/youth-jobs-web-app"
              className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs hover:border-[var(--color-primary-strong)] hover:text-[var(--color-text)]"
            >
              View blueprint
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-[var(--color-border)]">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            <p className="mb-4 inline-block rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-xs uppercase tracking-wider text-[var(--color-muted)]">
              Coming soon · Accra and Kumasi first
            </p>
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
              Real opportunities for{" "}
              <span style={{ color: "var(--color-accent)" }}>
                Ghana&apos;s youth
              </span>
              .
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-[var(--color-muted)] sm:text-lg">
              Verified jobs, apprenticeships, internships, gigs and skills
              training — built mobile-first, low-data, and trust-focused. No
              CV? No problem. We help you build one.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="/sign-in?intent=candidate"
                className="rounded-md bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--color-primary-strong)]"
              >
                Find work
              </a>
              <a
                href="/sign-in?intent=employer"
                className="rounded-md border border-[var(--color-border)] px-5 py-3 text-sm font-semibold hover:border-[var(--color-primary-strong)]"
              >
                Post a job or apprenticeship
              </a>
            </div>
            <p className="mt-2 text-xs text-[var(--color-muted)]">
              Free for job seekers, always. Sign in by SMS — no email or
              password needed.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {cities.map((c) => (
                <span
                  key={c}
                  className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-xs text-[var(--color-muted)]"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>

          <aside className="lg:col-span-5">
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
              <p className="text-xs uppercase tracking-wider text-[var(--color-muted)]">
                What you&apos;ll find
              </p>
              <ul className="mt-4 space-y-3">
                {categories.map((c) => (
                  <li
                    key={c.title}
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4"
                  >
                    <p className="text-sm font-semibold">{c.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted)]">
                      {c.desc}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </section>

      {/* Trust */}
      <section id="trust" className="border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="mb-10 max-w-2xl">
            <p className="text-xs uppercase tracking-wider text-[var(--color-muted)]">
              Built for trust
            </p>
            <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
              Job scams and unpaid labour break trust. We design against them
              from day one.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {trustPillars.map((p) => (
              <div
                key={p.title}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
              >
                <p className="text-sm font-semibold">{p.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
                  {p.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Audiences */}
      <section id="audiences" className="border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="mb-8 max-w-2xl">
            <p className="text-xs uppercase tracking-wider text-[var(--color-muted)]">
              Who it&apos;s for
            </p>
            <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
              One platform. Many real Ghanaian paths to dignified work.
            </h2>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {audiences.map((a) => (
              <li
                key={a}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)]"
              >
                {a}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Status / blueprint */}
      <section className="border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8">
            <p className="text-xs uppercase tracking-wider text-[var(--color-muted)]">
              Status
            </p>
            <h3 className="mt-2 text-xl font-semibold sm:text-2xl">
              Pre-MVP. We&apos;re running discovery interviews now.
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--color-muted)]">
              Before writing the full app we&apos;re talking to youth, master
              artisans, employers, training centres and NGOs in Accra and
              Kumasi. The product blueprint — 26 sections covering personas,
              trust and safety, data model, API, monetisation, and a 90-day
              MVP plan — is in this repository.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href="https://github.com/Emmanuelok/youth-jobs-web-app"
                className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm hover:border-[var(--color-primary-strong)]"
              >
                Read the repository
              </a>
              <a
                href="/sign-in?intent=candidate"
                className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-primary-strong)]"
              >
                Find work
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-10 text-xs text-[var(--color-muted)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © {new Date().getFullYear()} Ghana Youth Jobs · Built mobile-first and low-data ·
            Free for job seekers, always.
          </p>
          <nav className="flex gap-4">
            <a href="/privacy" className="hover:text-[var(--color-text)]">
              Privacy
            </a>
            <a href="/terms" className="hover:text-[var(--color-text)]">
              Terms
            </a>
          </nav>
        </div>
      </footer>
    </main>
  );
}
