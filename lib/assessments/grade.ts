import type { AssessmentQuestion } from "@/db/schema";

/**
 * Pure grading logic for skills assessments. All inputs and outputs are
 * plain data — no DB, no IO — so this is exhaustively testable.
 *
 * Grading rules:
 *   - Comparisons are case-insensitive, trimmed.
 *   - Multiple-choice and true/false: submitted value must match one of
 *     correctAnswers exactly (after normalisation).
 *   - Short-text-match: submitted value must match any of correctAnswers
 *     (after normalisation). Accept synonyms by listing them in
 *     correctAnswers when authoring.
 *   - A missing or empty answer is always wrong, never errors.
 *   - Score is the sum of points for correct answers, divided by the total
 *     points across the assessment, rendered as a 0-100 integer percentage.
 *
 * We never reveal correct answers in the result type; the caller decides
 * whether to surface explanations.
 */

export type SubmittedResponses = Record<string, string>;

export type GradedQuestion = {
  questionId: string;
  questionNumber: number;
  correct: boolean;
  submittedAnswer: string;
  earnedPoints: number;
  possiblePoints: number;
};

export type GradeResult = {
  score: number; // 0-100
  passed: boolean;
  correctCount: number;
  totalCount: number;
  earnedPoints: number;
  possiblePoints: number;
  questions: GradedQuestion[];
  // Normalised responses keyed by questionId, suitable for persistence.
  normalisedResponses: Record<string, string>;
};

export function normaliseAnswer(value: string | null | undefined): string {
  if (value == null) return "";
  return value.trim().toLowerCase();
}

export function gradeAssessment(
  questions: AssessmentQuestion[],
  submitted: SubmittedResponses,
  passingScore: number,
): GradeResult {
  const graded: GradedQuestion[] = [];
  let earnedPoints = 0;
  let possiblePoints = 0;
  const normalisedResponses: Record<string, string> = {};

  for (const q of questions) {
    const submittedRaw = submitted[q.id];
    const submittedNorm = normaliseAnswer(submittedRaw);
    normalisedResponses[q.id] = submittedNorm;

    const points = Math.max(1, q.points ?? 1);
    possiblePoints += points;

    const accepted = (q.correctAnswers ?? []).map(normaliseAnswer);
    // An empty submission is never correct, even if "" was somehow in accepted.
    const isCorrect =
      submittedNorm.length > 0 && accepted.includes(submittedNorm);

    if (isCorrect) earnedPoints += points;

    graded.push({
      questionId: q.id,
      questionNumber: q.questionNumber,
      correct: isCorrect,
      submittedAnswer: submittedNorm,
      earnedPoints: isCorrect ? points : 0,
      possiblePoints: points,
    });
  }

  // Stable ordering by question number.
  graded.sort((a, b) => a.questionNumber - b.questionNumber);

  const score =
    possiblePoints === 0
      ? 0
      : Math.round((earnedPoints / possiblePoints) * 100);
  const passed = score >= passingScore;
  const correctCount = graded.filter((g) => g.correct).length;

  return {
    score,
    passed,
    correctCount,
    totalCount: graded.length,
    earnedPoints,
    possiblePoints,
    questions: graded,
    normalisedResponses,
  };
}

/**
 * Deterministic, seedable shuffle. We do NOT shuffle questions on each
 * page load — that would re-order on a refresh and confuse candidates
 * mid-attempt. Instead we shuffle once at attempt creation using the
 * attempt ID as the seed.
 */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  // Simple, deterministic PRNG from a string seed (xfnv1a → mulberry32).
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let state = h >>> 0;
  const next = () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
