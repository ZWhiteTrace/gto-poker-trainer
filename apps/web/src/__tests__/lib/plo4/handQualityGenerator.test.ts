import { describe, expect, it } from "vitest";
import { evaluateStartingHandStrength } from "@/lib/plo4/handCategories";
import { generateHandQualityQuestion, type PLO4QuizQuestion } from "@/lib/plo4/quizGenerator";

function assertValidHandQualityQuestion(question: PLO4QuizQuestion) {
  expect(question.type).toBe("hand-quality");
  expect(question.options).toHaveLength(2);
  expect(question.correctOptionId === "opt-a" || question.correctOptionId === "opt-b").toBe(true);
  expect(question.prompt.length).toBeGreaterThan(0);
  expect(question.promptZh.length).toBeGreaterThan(0);
  expect(question.explanation.length).toBeGreaterThan(0);
  expect(question.explanationZh.length).toBeGreaterThan(0);
}

describe("PLO4 Quiz Generator — hand-quality", () => {
  it("generates a valid comparison question", () => {
    const question = generateHandQualityQuestion(42);
    assertValidHandQualityQuestion(question);
  });

  it("is deterministic with the same seed", () => {
    const first = generateHandQualityQuestion(42);
    const second = generateHandQualityQuestion(42);

    expect(first.id).toBe(second.id);
    expect(first.correctOptionId).toBe(second.correctOptionId);
  });

  it("compares structurally different hands", () => {
    const question = generateHandQualityQuestion(42);
    if (question.type !== "hand-quality") throw new Error("wrong type");

    expect(question.scenario.handACategory.categoryKey).not.toBe(question.scenario.handBCategory.categoryKey);
    expect(Math.abs(question.scenario.handAScore - question.scenario.handBScore)).toBeGreaterThanOrEqual(3);
  });

  it("matches the scoring helper", () => {
    const question = generateHandQualityQuestion(42);
    if (question.type !== "hand-quality") throw new Error("wrong type");

    const scoreA = evaluateStartingHandStrength(question.scenario.handA).score;
    const scoreB = evaluateStartingHandStrength(question.scenario.handB).score;

    expect(scoreA).toBe(question.scenario.handAScore);
    expect(scoreB).toBe(question.scenario.handBScore);
  });

  it("can generate many non-ambiguous questions", () => {
    for (let seed = 0; seed < 50; seed++) {
      const question = generateHandQualityQuestion(seed);
      assertValidHandQualityQuestion(question);
      if (question.type !== "hand-quality") throw new Error("wrong type");
      expect(Math.abs(question.scenario.handAScore - question.scenario.handBScore)).toBeGreaterThanOrEqual(3);
    }
  });
});
