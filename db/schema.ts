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
    acknowledgedTermsAt: timestamp("acknowledged_terms_at", {
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("applications_job_candidate_unique").on(t.jobId, t.candidateId)],
);

/**
 * Apprenticeship-specific terms. One row per apprenticeship job. Captured
 * at post time, displayed to the candidate before they apply, and rendered
 * as a printable agreement once a placement is made.
 *
 * IMPORTANT: We do not consider this a legally binding contract on its own.
 * Section 7 #23 of the blueprint flagged that an apprenticeship agreement
 * template needs a Ghanaian lawyer's review against the TVET Act (Act 1023,
 * 2020), Children's Act (Act 560), and Labour Act (Act 651). This is the
 * structured-data foundation that lets us render that template once
 * approved.
 */
export const apprenticeshipTerms = pgTable("apprenticeship_terms", {
  jobId: uuid("job_id")
    .primaryKey()
    .references(() => jobs.id, { onDelete: "cascade" }),
  durationMonths: integer("duration_months").notNull(),
  hoursPerWeek: integer("hours_per_week").notNull(),
  stipendAmountGhs: integer("stipend_amount_ghs"), // null = no stipend
  stipendPeriod: text("stipend_period"), // 'week'|'month'|null
  startTimeOfDay: text("start_time_of_day").notNull(), // 'HH:MM'
  endTimeOfDay: text("end_time_of_day").notNull(),
  daysOffPerWeek: integer("days_off_per_week").notNull(),
  trainingTopics: text("training_topics").array().notNull(),
  completionOutcome: text("completion_outcome").notNull(),
  notesForGuardians: text("notes_for_guardians"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

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
    // Recipient — may be a candidate, an employer, or anyone with a user row.
    // Column name kept as candidate_id for source compatibility; treat as recipientId.
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    channel: text("channel").notNull(), // 'sms' | 'whatsapp'
    kind: text("kind").notNull().default("digest"), // 'digest' | 'application_received' | 'application_withdrawn' | 'application_status' | 'job_decision'
    body: text("body").notNull(),
    jobIds: jsonb("job_ids").notNull(), // string[]
    providerOk: boolean("provider_ok").notNull(),
    providerError: text("provider_error"),
    sentAt: timestamp("sent_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("notif_log_candidate_sent_idx").on(t.candidateId, t.sentAt),
    index("notif_log_kind_idx").on(t.kind, t.sentAt),
  ],
);

/**
 * In-app messaging between an employer and a candidate, scoped to a single
 * job application. Phone numbers are never exposed across the boundary —
 * if the parties want to call, they exchange numbers in-message.
 */
export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    employerId: uuid("employer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    archivedByEmployer: boolean("archived_by_employer")
      .notNull()
      .default(false),
    archivedByCandidate: boolean("archived_by_candidate")
      .notNull()
      .default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("conversations_unique_idx").on(
      t.jobId,
      t.employerId,
      t.candidateId,
    ),
    index("conversations_employer_idx").on(t.employerId, t.lastMessageAt),
    index("conversations_candidate_idx").on(t.candidateId, t.lastMessageAt),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    flagSeverity: text("flag_severity"), // 'medium' | 'low' (HIGH is refused before insert)
    flagReasons: jsonb("flag_reasons"), // string[]
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("messages_conversation_idx").on(t.conversationId, t.createdAt),
    index("messages_flagged_idx").on(t.flagSeverity, t.createdAt),
  ],
);

/**
 * Guardian consent for users under 18. We never let a minor apply for an
 * opportunity until a consent row with decision='approved' exists. Tokens
 * are SMS-delivered to the guardian's phone and expire after 14 days.
 */
export const guardianConsents = pgTable(
  "guardian_consents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    guardianName: text("guardian_name").notNull(),
    guardianRelation: text("guardian_relation").notNull(), // 'parent'|'guardian'|'family_member'|'community_leader'
    guardianPhone: text("guardian_phone").notNull(),
    token: text("token").notNull(),
    requestedAt: timestamp("requested_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    decisionAt: timestamp("decision_at", { withTimezone: true }),
    decision: text("decision"), // 'approved' | 'refused'
    decisionIp: text("decision_ip"), // forwarded-for, useful for audit
    refusalReason: text("refusal_reason"),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("guardian_consents_token_idx").on(t.token),
    index("guardian_consents_candidate_idx").on(t.candidateId, t.requestedAt),
  ],
);

export type GeneratedCv = typeof generatedCvs.$inferSelect;
export type NotificationLog = typeof notificationLog.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type GuardianConsent = typeof guardianConsents.$inferSelect;
export type ApprenticeshipTerms = typeof apprenticeshipTerms.$inferSelect;
