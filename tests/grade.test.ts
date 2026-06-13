import { describe, it, expect } from "vitest";
import {
  gradeAssessment,
  normaliseAnswer,
  seededShuffle,
} from "@/lib/assessments/grade";
import type { AssessmentQuestion } from "@/db/schema";

function q(
  overrides: Partial<AssessmentQuestion> = {},
): AssessmentQuestion {
  return {
    id: "q1",
    assessmentId: "a1",
    questionNumber: 1,
    prompt: "x",
    questionType: "multiple_choice",
    options: [
      { id: "a", text: "A" },
      { id: "b", text: "B" },
    ],
    correctAnswers: ["a"],
    explanation: null,
    points: 1,
    ...overrides,
  };
}

describe("normaliseAnswer", () => {
  it("lowercases and trims", () => {
    expect(normaliseAnswer("  Yes ")).toBe("yes");
  });
  it("handles null/undefined as empty", () => {
    expect(normaliseAnswer(null)).toBe("");
    expect(normaliseAnswer(undefined)).toBe("");
  });
});

describe("gradeAssessment — correctness", () => {
  it("grades a perfect score as passed", () => {
    const r = gradeAssessment(
      [q({ id: "1" }), q({ id: "2", correctAnswers: ["b"] })],
      { "1": "a", "2": "b" },
      70,
    );
    expect(r.score).toBe(100);
    expect(r.passed).toBe(true);
    expect(r.correctCount).toBe(2);
  });

  it("grades zero correct as failed", () => {
    const r = gradeAssessment(
      [q({ id: "1" }), q({ id: "2" })],
      { "1": "b", "2": "b" },
      70,
    );
    expect(r.score).toBe(0);
    expect(r.passed).toBe(false);
  });

  it("normalises submitted answers (case + whitespace)", () => {
    const r = gradeAssessment(
      [q({ correctAnswers: ["accra"], questionType: "short_text_match" })],
      { q1: "  ACCRA  " },
      70,
    );
    expect(r.score).toBe(100);
  });

  it("treats empty submissions as wrong even if '' is accidentally in correctAnswers", () => {
    const r = gradeAssessment(
      [q({ correctAnswers: ["", "a"] })],
      { q1: "" },
      70,
    );
    expect(r.score).toBe(0);
  });

  it("weights by points", () => {
    const r = gradeAssessment(
      [q({ id: "1", points: 1 }), q({ id: "2", points: 3, correctAnswers: ["b"] })],
      { "1": "a", "2": "x" }, // correct + wrong; earned 1 of 4
      50,
    );
    expect(r.score).toBe(25);
    expect(r.passed).toBe(false);
  });

  it("passes when score equals the passing threshold", () => {
    const r = gradeAssessment(
      [
        q({ id: "1" }),
        q({ id: "2", correctAnswers: ["b"] }),
        q({ id: "3" }),
        q({ id: "4", correctAnswers: ["b"] }),
        q({ id: "5", correctAnswers: ["a"] }),
      ],
      { "1": "a", "2": "b", "3": "a", "4": "x", "5": "x" },
      60,
    );
    expect(r.score).toBe(60);
    expect(r.passed).toBe(true);
  });

  it("accepts any synonym for short_text_match", () => {
    const r = gradeAssessment(
      [
        q({
          questionType: "short_text_match",
          correctAnswers: ["accra", "the accra"],
        }),
      ],
      { q1: "The Accra" },
      70,
    );
    expect(r.score).toBe(100);
  });

  it("returns sorted, typed per-question results", () => {
    const r = gradeAssessment(
      [
        q({ id: "1", questionNumber: 2 }),
        q({ id: "2", questionNumber: 1, correctAnswers: ["b"] }),
      ],
      { "1": "a", "2": "b" },
      70,
    );
    expect(r.questions.map((g) => g.questionNumber)).toEqual([1, 2]);
    expect(r.questions[0].correct).toBe(true);
    expect(r.questions[1].correct).toBe(true);
  });
});

describe("seededShuffle", () => {
  it("is deterministic for the same seed", () => {
    const a = seededShuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], "seed-x");
    const b = seededShuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], "seed-x");
    expect(a).toEqual(b);
  });

  it("differs across seeds (high probability)", () => {
    const a = seededShuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], "seed-x");
    const b = seededShuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], "seed-y");
    expect(a).not.toEqual(b);
  });

  it("contains the same elements", () => {
    const a = seededShuffle([1, 2, 3, 4, 5], "abc");
    expect([...a].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it("returns a new array (does not mutate)", () => {
    const input = [1, 2, 3];
    seededShuffle(input, "x");
    expect(input).toEqual([1, 2, 3]);
  });
});
