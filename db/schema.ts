import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

/**
 * users — single identity row. A user can act as candidate, employer, or admin.
 * Multi-role support deferred to V1; for MVP `primaryRole` decides default UI.
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phone: text("phone").notNull(), // E.164, e.g. "+233244000000"
    primaryRole: text("primary_role").notNull(), // 'candidate' | 'employer' | 'admin'
    isUnder18: boolean("is_under_18").notNull().default(false),
    bannedAt: timestamp("banned_at", { withTimezone: true }),
    banReason: text("ban_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("users_phone_unique").on(t.phone)],
);

export const candidateProfiles = pgTable("candidate_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  city: text("city").notNull(),
  region: text("region").notNull(),
  educationLevel: text("education_level").notNull(), // 'jhs'|'shs'|'tvet'|'university'|'none'|'other'
  skills: text("skills").array().notNull().default([]),
  languages: text("languages").array().notNull().default([]),
  availability: text("availability").notNull(), // 'immediate'|'two_weeks'|'flexible'
  yearOfBirth: integer("year_of_birth").notNull(),
  guardianContact: text("guardian_contact"), // required when isUnder18
  bio: text("bio"),
  alertsEnabled: boolean("alerts_enabled").notNull().default(true),
  notifyChannel: text("notify_channel").notNull().default("sms"), // 'sms' | 'whatsapp' | 'none'
  lastAlertedAt: timestamp("last_alerted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const employerProfiles = pgTable("employer_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationName: text("organization_name").notNull(),
  organizationType: text("organization_type").notNull(), // 'company'|'sole_proprietor'|'artisan'|'training_provider'|'ngo'
  city: text("city").notNull(),
  region: text("region").notNull(),
  contactName: text("contact_name").notNull(),
  ghanaCardLast4: text("ghana_card_last4"), // last 4 digits only — verification reference
  businessRegistrationNumber: text("business_registration_number"),
  description: text("description"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  verifiedBy: uuid("verified_by"),
  rejectedReason: text("rejected_reason"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    employerId: uuid("employer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // 'job'|'apprenticeship'|'internship'|'gig'
    title: text("title").notNull(),
    description: text("description").notNull(),
    category: text("category").notNull(), // 'tailoring'|'mechanic'|... (free for now, taxonomy later)
    city: text("city").notNull(),
    region: text("region").notNull(),
    payAmountGhs: integer("pay_amount_ghs"), // nullable for unpaid apprenticeships
    payPeriod: text("pay_period").notNull(), // 'hour'|'day'|'week'|'month'|'stipend'|'unpaid_with_skills'
    minimumAge: integer("minimum_age").notNull().default(18),
    isHazardous: boolean("is_hazardous").notNull().default(false),
    status: text("status").notNull().default("pending_review"), // 'draft'|'pending_review'|'published'|'rejected'|'closed'
    rejectedReason: text("rejected_reason"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("jobs_status_idx").on(t.status),
    index("jobs_city_idx").on(t.city),
    index("jobs_published_at_idx").on(t.publishedAt),
  ],
);

export const applications = pgTable(
  "applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("submitted"), // 'submitted'|'shortlisted'|'rejected'|'hired'|'withdrawn'
    message: text("message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("applications_job_candidate_unique").on(t.jobId, t.candidateId)],
);

export const scamReports = pgTable("scam_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id")
    .notNull()
    .references(() => jobs.id, { onDelete: "cascade" }),
  reporterId: uuid("reporter_id").references(() => users.id, {
    onDelete: "set null",
  }),
  category: text("category").notNull(), // 'asks_for_money'|'fake_company'|'unsafe'|'discriminatory'|'other'
  notes: text("notes"),
  status: text("status").notNull().default("open"), // 'open'|'actioned'|'dismissed'
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolvedBy: uuid("resolved_by"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const otpCodes = pgTable(
  "otp_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phone: text("phone").notNull(),
    codeHash: text("code_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    attempts: integer("attempts").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("otp_phone_created_idx").on(t.phone, t.createdAt)],
);

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * AI-generated CVs. We keep history rather than overwriting so candidates
 * can compare versions and we can audit prompts/usage if a CV ever needs
 * to be defended or explained.
 */
export const generatedCvs = pgTable(
  "generated_cvs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    payload: jsonb("payload").notNull(), // Cv shape — see lib/ai/cv.ts
    promptInputs: jsonb("prompt_inputs"), // what we sent the model, redacted of PII we didn't need
    modelId: text("model_id").notNull(),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    cacheReadTokens: integer("cache_read_tokens"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("generated_cvs_candidate_created_idx").on(t.candidateId, t.createdAt)],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type CandidateProfile = typeof candidateProfiles.$inferSelect;
export type EmployerProfile = typeof employerProfiles.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type Application = typeof applications.$inferSelect;
/**
 * Outbound job-alert digest log. Append-only — used for de-dup, reporting,
 * and to defend "what was sent" if a user reports a problem.
 */
export const notificationLog = pgTable(
  "notification_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    channel: text("channel").notNull(), // 'sms' | 'whatsapp'
    body: text("body").notNull(),
    jobIds: jsonb("job_ids").notNull(), // string[]
    providerOk: boolean("provider_ok").notNull(),
    providerError: text("provider_error"),
    sentAt: timestamp("sent_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("notif_log_candidate_sent_idx").on(t.candidateId, t.sentAt)],
);

export type GeneratedCv = typeof generatedCvs.$inferSelect;
export type NotificationLog = typeof notificationLog.$inferSelect;
