CREATE TABLE "assessment_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"score" integer,
	"passed" boolean,
	"responses" jsonb,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "assessment_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"question_number" integer NOT NULL,
	"prompt" text NOT NULL,
	"question_type" text NOT NULL,
	"options" jsonb,
	"correct_answers" text[] NOT NULL,
	"explanation" text,
	"points" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"skill_slug" text NOT NULL,
	"title" text NOT NULL,
	"intro_text" text NOT NULL,
	"passing_score" integer DEFAULT 70 NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill_badges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" uuid NOT NULL,
	"skill_slug" text NOT NULL,
	"source" text NOT NULL,
	"attempt_id" uuid,
	"score" integer,
	"earned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"revoked_reason" text
);
--> statement-breakpoint
CREATE TABLE "skills_taxonomy" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_candidate_id_users_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_skill_slug_skills_taxonomy_slug_fk" FOREIGN KEY ("skill_slug") REFERENCES "public"."skills_taxonomy"("slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_badges" ADD CONSTRAINT "skill_badges_candidate_id_users_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_badges" ADD CONSTRAINT "skill_badges_skill_slug_skills_taxonomy_slug_fk" FOREIGN KEY ("skill_slug") REFERENCES "public"."skills_taxonomy"("slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_badges" ADD CONSTRAINT "skill_badges_attempt_id_assessment_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."assessment_attempts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assessment_attempts_candidate_idx" ON "assessment_attempts" USING btree ("candidate_id","completed_at");--> statement-breakpoint
CREATE INDEX "assessment_attempts_assessment_idx" ON "assessment_attempts" USING btree ("assessment_id","completed_at");--> statement-breakpoint
CREATE INDEX "assessment_questions_idx" ON "assessment_questions" USING btree ("assessment_id","question_number");--> statement-breakpoint
CREATE INDEX "assessments_active_skill_idx" ON "assessments" USING btree ("skill_slug","language","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "skill_badges_candidate_skill_unique" ON "skill_badges" USING btree ("candidate_id","skill_slug");--> statement-breakpoint
CREATE INDEX "skill_badges_candidate_idx" ON "skill_badges" USING btree ("candidate_id","earned_at");