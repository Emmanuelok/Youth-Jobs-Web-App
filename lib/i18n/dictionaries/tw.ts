import type { Messages } from "./en";

/**
 * Twi (Akan) message catalog.
 *
 * ⚠️ PROVENANCE / STATUS: DRAFT — best-effort translation, NOT yet reviewed
 * by a native Akan Twi speaker. Before this locale is treated as
 * production-ready it MUST be QA'd by a fluent speaker, with special care for
 * the `safety.*` strings: a mistranslated safety warning is worse than
 * showing English. Until QA is signed off, treat Twi as an assistive aid
 * rather than an authority. Tracking owner: Trust & Safety.
 *
 * Satisfying the Messages type guarantees completeness — every English key
 * has a Twi counterpart here, so there are never missing-key gaps in the UI.
 */
export const tw: Messages = {
  nav: {
    findWork: "Hwehwɛ adwuma",
    applications: "Abisadeɛ",
    myCv: "Me CV",
    messages: "Nkrasɛm",
    settings: "Nhyehyɛeɛ",
    employer: "Adwumawura",
    admin: "Sohwɛfoɔ",
    signIn: "Bra mu",
    signOut: "Pue",
    postJob: "Fa adwuma to hɔ",
    preview: "Hwɛ kane",
    language: "Kasa",
  },
  landing: {
    badge: "Ɛreba seesei ara · Accra ne Kumasi kane",
    titleLead: "Hokwan ankasa ma",
    titleEmph: "Ghana mmabunu",
    subtitle:
      "Adwuma a wɔahwɛ so, adwumayɛ nkyerɛkyerɛ, internship, gigs ne nimdeɛ nkyerɛkyerɛ — yɛayɛ no ama mfoni-kane, data kakraa, ne ahotosoɔ. CV nni hɔ? Ɛnyɛ haw. Yɛbɛboa wo ayɛ bi.",
    ctaFindWork: "Hwehwɛ adwuma",
    ctaPostJob: "Fa adwuma anaa adwumayɛ nkyerɛkyerɛ to hɔ",
    ctaNote:
      "Ɛyɛ kwa ma wɔn a wɔrehwehwɛ adwuma, daa. Fa SMS bra mu — email anaa password nhia.",
    categoriesTitle: "Deɛ wobɛnya",
    trustKicker: "Yɛsi gyina ahotosoɔ so",
    trustTitle:
      "Adwuma asisie ne adwuma a wɔntua ho ka sɛe ahotosoɔ. Yɛko tia no firi ɛda a ɛdi kan.",
    audiencesKicker: "Hena na ɛwɔ hɔ ma",
    audiencesTitle:
      "Beae baako. Akwan pii a Ghanafoɔ fa so nya adwuma a ɛwɔ animuonyam.",
  },
  safety: {
    title: "Bɔ wo ho ban bere a worebisa adwuma",
    neverPay: "Ntua sika biara da na woanya adwuma anaa adwumayɛ nkyerɛkyerɛ.",
    meetPublic: "Hyia wɔ baguam wɔ awia bere mu ma wo nhyiamu a ɛdi kan.",
    tellSomeone:
      "Ka kyerɛ obi a wogye no di faako a worekɔ ne bere a wobɛsan aba.",
    leaveAndReport: "Sɛ biribi nyɛ papa a, fi hɔ na bɔ post no ho amaneɛ.",
    messageWarning:
      "Mfa sika nkɔma obiara na nkyɛ wo OTP nɔma. Hyia wo nhyiamu a ɛdi kan wɔ baguam awia bere mu. Ka kyerɛ obi a wogye no di faako a worekɔ.",
    noMoneyShort: "Nkyɛ OTP nɔma anaa mfa sika nkɔma obiara wɔ ha.",
    freeForever: "Ɛyɛ kwa ma wɔn a wɔrehwehwɛ adwuma — daa.",
  },
  signIn: {
    titleSeeker: "Hwehwɛ adwuma",
    titleEmployer: "Fa adwuma anaa adwumayɛ nkyerɛkyerɛ to hɔ",
    intro:
      "Fa wo Ghana fon nɔma to mu. Yɛbɛsoma kɔɔd a ɛyɛ nɔma 6 wɔ SMS so. Yɛrentua wo sika da sɛ worebisa adwuma.",
    lookingForWork: "Merehwehwɛ adwuma",
    hiring: "Merefa nnipa",
    phoneLabel: "Fon nɔma",
    sendCode: "Soma kɔɔd",
    smsConsent:
      "Sɛ wotoa so a, wopene so sɛ yɛbɛtumi asoma wo SMS ama bra mu ne wo abisadeɛ ho nsɛm. SMS ka a ɛtaa ba no bɛtumi aba.",
    verifyTitle: "Fa wo kɔɔd to mu",
    verifyIntro: "Yɛasoma kɔɔd a ɛyɛ nɔma 6 akɔ",
    verifyExpiry: "Ɛbɛtwam wɔ simma 10 mu.",
    codeLabel: "Kɔɔd a ɛyɛ nɔma 6",
    verifyContinue: "Hwɛ hu na toa so",
    noCode: "Woannya kɔɔd?",
    sendNew: "Soma foforɔ",
  },
  common: {
    continue: "Toa so",
    save: "Sie",
    cancel: "Gyae",
    back: "San kɔ",
    loading: "Ɛreba…",
  },
  errors: {
    notFoundTitle: "Wonhuu krataafa no",
    notFoundBody:
      "Yɛanhu saa krataafa no. Ebia wɔayi afi hɔ, anaa adwuma no ato mu.",
    errorTitle: "Biribi anyɛ yie",
    errorBody:
      "Kafra — biribi asɛe wɔ yɛn fa. Yɛsrɛ sɛ sɔ hwɛ bio. Sɛ ɛkɔ so a, san bra akyiri yi.",
    tryAgain: "Sɔ hwɛ bio",
    goHome: "Kɔ fie",
    browseJobs: "Hwehwɛ adwuma",
  },
};
