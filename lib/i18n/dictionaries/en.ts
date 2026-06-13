/**
 * English message catalog — the source of truth.
 *
 * The shape of this object IS the Messages type; every other locale must
 * satisfy it, so adding a key here forces every locale to provide it (or
 * fail the build). Keep keys grouped by surface.
 */
export const en = {
  nav: {
    findWork: "Find work",
    applications: "Applications",
    myCv: "My CV",
    messages: "Messages",
    settings: "Settings",
    employer: "Employer",
    admin: "Admin",
    signIn: "Sign in",
    signOut: "Sign out",
    postJob: "Post a job",
    preview: "Preview",
    language: "Language",
    saved: "Saved",
    skipToContent: "Skip to main content",
  },
  saved: {
    title: "Saved opportunities",
    save: "Save",
    saved: "Saved",
    remove: "Remove",
    empty: "You haven't saved any opportunities yet.",
    browse: "Browse opportunities",
  },
  interview: {
    proposeTitle: "Propose an interview",
    when: "Date and time",
    duration: "Duration (minutes)",
    mode: "Mode",
    modeInPerson: "In person",
    modePhone: "Phone call",
    modeVideo: "Video call",
    locationLabel: "Location or link",
    locationHelpInPerson: "Where will it happen? Be specific.",
    locationHelpPhone: "Optional: which number to call.",
    locationHelpVideo: "Paste the meeting link.",
    notesLabel: "Notes (optional, visible to the candidate)",
    submit: "Send proposal",
    pending: "Awaiting candidate confirmation",
    confirmed: "Confirmed",
    declined: "Declined",
    cancelled: "Cancelled",
    completed: "Completed",
    noShow: "No-show",
    confirm: "Confirm",
    decline: "Decline",
    cancel: "Cancel",
    markCompleted: "Mark completed",
    markNoShow: "Mark no-show",
    safety:
      "First interviews: meet in a public place during the day, tell a trusted person where you are going, and never send money.",
    upcomingTitle: "Upcoming interviews",
    none: "No interviews yet.",
  },
  skills: {
    title: "Skill badges",
    intro:
      "Take a short, free assessment to earn a verified badge. Employers see your badges next to your name when you apply.",
    earned: "You hold this badge",
    notTaken: "Not taken yet",
    failedRecently: "Try again soon",
    takeButton: "Take the assessment",
    startButton: "Start now",
    retakeButton: "Try again",
    questionCount: "questions",
    passingScore: "Pass mark",
    yourScore: "Your score",
    youPassed: "You earned the badge!",
    youDidntPass: "Not quite — review the answers and try again later.",
    submitAnswers: "Submit answers",
    questionLabel: "Question",
    of: "of",
    reviewExplanations: "Review the answers",
    backToSkills: "Back to skill badges",
    yourBadgesTitle: "Your badges",
    noBadgesYet: "No badges yet — start with one of the assessments below.",
    correct: "Correct",
    incorrect: "Incorrect",
    youAnswered: "Your answer",
    acceptedAnswers: "Accepted answers",
  },
  landing: {
    badge: "Coming soon · Accra and Kumasi first",
    titleLead: "Real opportunities for",
    titleEmph: "Ghana's youth",
    subtitle:
      "Verified jobs, apprenticeships, internships, gigs and skills training — built mobile-first, low-data, and trust-focused. No CV? No problem. We help you build one.",
    ctaFindWork: "Find work",
    ctaPostJob: "Post a job or apprenticeship",
    ctaNote:
      "Free for job seekers, always. Sign in by SMS — no email or password needed.",
    categoriesTitle: "What you'll find",
    trustKicker: "Built for trust",
    trustTitle:
      "Job scams and unpaid labour break trust. We design against them from day one.",
    audiencesKicker: "Who it's for",
    audiencesTitle: "One platform. Many real Ghanaian paths to dignified work.",
  },
  safety: {
    title: "Stay safe when applying",
    neverPay: "Never pay money to get a job or apprenticeship.",
    meetPublic:
      "Meet for the first interview in a public place during the day.",
    tellSomeone:
      "Tell a trusted person where you are going and when you expect to return.",
    leaveAndReport: "If anything feels wrong, leave and report the post.",
    messageWarning:
      "Never send money or share OTP codes. Meet first interviews in a public place during the day. Tell a trusted person where you are going.",
    noMoneyShort: "Don't share OTP codes or send money to anyone here.",
    freeForever: "Free for job seekers — always.",
  },
  signIn: {
    titleSeeker: "Find work",
    titleEmployer: "Post a job or apprenticeship",
    intro:
      "Enter your Ghana mobile number. We'll send a 6-digit code by SMS. We will never charge you to apply for a job.",
    lookingForWork: "I'm looking for work",
    hiring: "I'm hiring",
    phoneLabel: "Phone number",
    sendCode: "Send code",
    smsConsent:
      "By continuing you agree that we can send you SMS for sign-in and application updates. Standard SMS rates may apply.",
    verifyTitle: "Enter your code",
    verifyIntro: "We sent a 6-digit code to",
    verifyExpiry: "It expires in 10 minutes.",
    codeLabel: "6-digit code",
    verifyContinue: "Verify and continue",
    noCode: "Didn't get a code?",
    sendNew: "Send a new one",
  },
  common: {
    continue: "Continue",
    save: "Save",
    cancel: "Cancel",
    back: "Back",
    loading: "Loading…",
  },
  errors: {
    notFoundTitle: "Page not found",
    notFoundBody:
      "We couldn't find that page. It may have moved, or the opportunity may have closed.",
    errorTitle: "Something went wrong",
    errorBody:
      "Sorry — something broke on our side. Please try again. If it keeps happening, check back a bit later.",
    tryAgain: "Try again",
    goHome: "Go home",
    browseJobs: "Browse opportunities",
  },
};

export type Messages = typeof en;
