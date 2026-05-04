import { z } from "zod";

/**
 * Ghana mobile numbers in E.164:
 *   +233 followed by a 9-digit national number that starts with 2 (Vodafone/
 *   AirtelTigo/MTN ranges all begin with 2 after the leading 0 is dropped).
 *
 * We accept several common user inputs and normalise to +233XXXXXXXXX.
 * NOTE: This is a pragmatic regex, not a full carrier check. Validate the
 *   live numbering plan with the National Communications Authority before
 *   relying on it for compliance decisions.
 */
const GHANA_PHONE_REGEX = /^\+233[235]\d{8}$/;

export function normaliseGhanaPhone(input: string): string | null {
  const cleaned = input.replace(/[\s\-()]/g, "");
  if (/^\+233\d{9}$/.test(cleaned)) return cleaned;
  if (/^233\d{9}$/.test(cleaned)) return `+${cleaned}`;
  if (/^0\d{9}$/.test(cleaned)) return `+233${cleaned.slice(1)}`;
  return null;
}

export const phoneSchema = z
  .string()
  .min(1)
  .transform((v, ctx) => {
    const n = normaliseGhanaPhone(v);
    if (!n || !GHANA_PHONE_REGEX.test(n)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Enter a Ghana mobile number, e.g. 0244 123 456 or +233 24 412 3456.",
      });
      return z.NEVER;
    }
    return n;
  });

export const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Enter the 6-digit code from your SMS.");

export const candidateProfileSchema = z.object({
  fullName: z.string().min(2).max(120),
  city: z.string().min(2).max(80),
  region: z.string().min(2).max(80),
  educationLevel: z.enum(["jhs", "shs", "tvet", "university", "none", "other"]),
  skills: z.array(z.string().min(1).max(40)).max(5),
  languages: z.array(z.string().min(2).max(20)).max(6),
  availability: z.enum(["immediate", "two_weeks", "flexible"]),
  yearOfBirth: z
    .number()
    .int()
    .gte(1950)
    .lte(new Date().getFullYear() - 13),
  guardianContact: z.string().min(8).max(40).optional(),
  bio: z.string().max(500).optional(),
});

export const employerProfileSchema = z.object({
  organizationName: z.string().min(2).max(120),
  organizationType: z.enum([
    "company",
    "sole_proprietor",
    "artisan",
    "training_provider",
    "ngo",
  ]),
  city: z.string().min(2).max(80),
  region: z.string().min(2).max(80),
  contactName: z.string().min(2).max(120),
  ghanaCardLast4: z.string().regex(/^\d{4}$/).optional(),
  businessRegistrationNumber: z.string().max(40).optional(),
  description: z.string().max(800).optional(),
});

export const jobPostSchema = z.object({
  type: z.enum(["job", "apprenticeship", "internship", "gig"]),
  title: z.string().min(4).max(120),
  description: z.string().min(20).max(4000),
  category: z.string().min(2).max(60),
  city: z.string().min(2).max(80),
  region: z.string().min(2).max(80),
  payAmountGhs: z.number().int().nonnegative().nullable(),
  payPeriod: z.enum([
    "hour",
    "day",
    "week",
    "month",
    "stipend",
    "unpaid_with_skills",
  ]),
  minimumAge: z.number().int().gte(15).lte(65).default(18),
  isHazardous: z.boolean().default(false),
});

export const messageBodySchema = z
  .string()
  .trim()
  .min(1, "Type a message before sending.")
  .max(2000, "Keep messages under 2000 characters.");

export const scamReportSchema = z.object({
  jobId: z.string().uuid(),
  category: z.enum([
    "asks_for_money",
    "fake_company",
    "unsafe",
    "discriminatory",
    "other",
  ]),
  notes: z.string().max(1000).optional(),
});
