import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { log } from "@/lib/log";
import { getAnthropic } from "./client";

/**
 * AI CV generator for the Ghana Youth Jobs platform.
 *
 * Designed for the no-CV cohort: candidates who finished SHS or TVET, did
 * apprenticeships, or have only informal/community experience and no
 * polished CV. We never invent experience — the model only formats what
 * the candidate has shared.
 *
 * Stack:
 *   - Model: claude-opus-4-7
 *   - Adaptive thinking on (silent default on Opus 4.7), effort: high
 *   - Structured output via output_config.format with a Zod schema
 *   - max_tokens: 16000 (well within the non-streaming HTTP-timeout window)
 */

export const cvSchema = z.object({
  fullName: z.string(),
  headline: z
    .string()
    .describe(
      "One short tagline, e.g. 'Junior tailor seeking apprenticeship in Kumasi'.",
    ),
  summary: z
    .string()
    .describe(
      "2-3 honest sentences a busy employer can scan in 5 seconds. No marketing fluff.",
    ),
  location: z.object({
    city: z.string(),
    region: z.string(),
  }),
  languages: z.array(
    z.object({
      name: z.string(),
      proficiency: z.enum(["basic", "conversational", "fluent"]),
    }),
  ),
  skills: z.array(
    z.object({
      name: z.string(),
      level: z.enum(["learning", "comfortable", "strong"]),
    }),
  ),
  experience: z.array(
    z.object({
      title: z.string(),
      organization: z.string(),
      location: z.string().optional(),
      period: z
        .string()
        .describe("e.g. '2023 — present', 'Jan 2024 — Apr 2024'"),
      bullets: z
        .array(z.string())
        .describe("Concrete actions, real responsibilities, small numbers."),
    }),
  ),
  education: z.array(
    z.object({
      school: z.string(),
      qualification: z.string(),
      period: z.string(),
    }),
  ),
  notes: z
    .string()
    .optional()
    .describe(
      "Any honest gaps or context the candidate may want to mention in interview. Keep it short.",
    ),
});

export type Cv = z.infer<typeof cvSchema>;

export type CvProfileInput = {
  fullName: string;
  city: string;
  region: string;
  yearOfBirth: number;
  educationLevel: string;
  skills: string[];
  languages: string[];
  availability: string;
  bio?: string | null;
  isUnder18: boolean;
};

const SYSTEM_PROMPT = `You are writing a CV for a young Ghanaian job seeker.

Hard rules:
- Never invent experience, skills, schools, certifications, or dates. Only use what the candidate has shared.
- If the candidate has no formal work history, draw from school projects, community contributions, family or household responsibilities, religious-group volunteering, sports, and informal trades. These are real, valued, and worth listing.
- Apprenticeship time (e.g. assisting a master tailor, mechanic, or hairdresser) is real work experience and belongs in the experience section.
- For candidates under 18, never list hazardous-trade experience (welding, construction, heavy machinery, late-night work).
- Use plain English the candidate would recognise and could explain in an interview.
- Treat fluency in Twi, Ga, Ewe, Dagbani, Hausa, or French as a real plus and surface it clearly.

Style:
- Sentence case, not Title Case.
- No marketing fluff — avoid words like "dynamic", "passionate", "highly motivated", "results-driven", "go-getter", "hardworking team-player".
- Bullets lead with concrete actions. Include small numbers when the candidate provided them. If they didn't, don't make them up.
- The summary is 2-3 honest sentences a busy employer can scan in 5 seconds.
- If the candidate's information is sparse, produce a small but real CV. Do not pad it with generic filler.

Output ONLY valid JSON matching the provided schema. Do not add commentary.`;

export type CvGenerationResult = {
  cv: Cv;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
};

export async function generateCv(input: {
  profile: CvProfileInput;
  rawNotes?: string;
}): Promise<CvGenerationResult> {
  const client = getAnthropic();
  const userPrompt = buildUserPrompt(input);
  const start = Date.now();

  let response;
  try {
    response = await client.messages.parse({
      model: "claude-opus-4-7",
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "high",
        format: zodOutputFormat(cvSchema),
      },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });
  } catch (err) {
    log.error("cv.generate_failed", {
      durationMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }

  if (!response.parsed_output) {
    log.error("cv.generate_unparseable", {
      durationMs: Date.now() - start,
      stopReason: response.stop_reason,
    });
    throw new Error(
      `CV generation did not return a parseable structured response (stop_reason=${response.stop_reason}).`,
    );
  }

  log.info("cv.generated", {
    durationMs: Date.now() - start,
    model: response.model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
  });

  return {
    cv: response.parsed_output,
    modelId: response.model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
  };
}

function buildUserPrompt({
  profile,
  rawNotes,
}: {
  profile: CvProfileInput;
  rawNotes?: string;
}): string {
  const age = new Date().getFullYear() - profile.yearOfBirth;
  const skillsList = profile.skills.length
    ? profile.skills.join(", ")
    : "(none listed)";
  const languagesList = profile.languages.length
    ? profile.languages.join(", ")
    : "(none listed)";

  return [
    "Candidate profile (only what they shared with us):",
    "",
    `- Full name: ${profile.fullName}`,
    `- City: ${profile.city}, Region: ${profile.region}`,
    `- Year of birth: ${profile.yearOfBirth} (computed age: ${age}${profile.isUnder18 ? ", under 18" : ""})`,
    `- Highest education: ${profile.educationLevel}`,
    `- Languages: ${languagesList}`,
    `- Skills (raw): ${skillsList}`,
    `- Availability: ${profile.availability}`,
    `- Short bio: ${profile.bio?.trim() || "(none provided)"}`,
    "",
    rawNotes && rawNotes.trim().length > 0
      ? `Rough notes from the candidate (verbatim, may include grammar errors — do not embarrass them):\n${rawNotes.trim()}`
      : "(no extra notes)",
    "",
    "Generate a CV that this person would be proud to carry to an interview today. Be honest about what is and isn't there. If the information is sparse, produce a small but real CV — do not pad it with generic filler.",
  ].join("\n");
}
