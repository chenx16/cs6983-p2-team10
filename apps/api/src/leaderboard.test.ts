import { describe, expect, it } from "vitest";
import { calculateLeaderboard, type LeaderboardPrediction } from "./leaderboard.js";

const prediction = (
  userId: string,
  username: string,
  questionId: string,
  answerId: string,
  correctAnswerId: string,
  creditsCharged = 100,
): LeaderboardPrediction => ({
  userId,
  username,
  questionId,
  answerId,
  correctAnswerId,
  creditsCharged,
});

const questions = (
  userId: string,
  username: string,
  correctCount: number,
  questionCount = 5,
) => Array.from({ length: questionCount }, (_, index) =>
  prediction(userId, username, `question-${index}`, index < correctCount ? "correct" : "wrong", "correct"),
);

describe("public leaderboard scoring", () => {
  it("counts a question only when more than half of its credits are correct", () => {
    const result = calculateLeaderboard([
      prediction("user-1", "weighted", "q1", "correct", "correct", 51),
      prediction("user-1", "weighted", "q1", "wrong", "correct", 49),
      prediction("user-1", "weighted", "q2", "correct", "correct", 50),
      prediction("user-1", "weighted", "q2", "wrong", "correct", 50),
      ...questions("user-1", "weighted", 2, 3),
    ]);

    expect(result[0]).toMatchObject({ username: "weighted", scoredQuestions: 5, successRate: 60 });
  });

  it("ranks by success rate, then scored questions, and shares tied ranks alphabetically", () => {
    const result = calculateLeaderboard([
      ...questions("user-a", "alpha", 4, 5),
      ...questions("user-b", "bravo", 4, 5),
      ...questions("user-c", "charlie", 3, 5),
      ...questions("user-d", "delta", 5, 7),
    ]);

    expect(result.map((entry) => [entry.rank, entry.username])).toEqual([
      [1, "alpha"],
      [1, "bravo"],
      [3, "delta"],
      [4, "charlie"],
    ]);
  });

  it("leaves users with fewer than five scored questions unranked", () => {
    const result = calculateLeaderboard([
      ...questions("user-a", "alpha", 5, 5),
      ...questions("user-b", "beta", 4, 4),
    ]);

    expect(result).toMatchObject([
      { rank: 1, username: "alpha" },
      { rank: null, username: "beta", scoredQuestions: 4 },
    ]);
  });
});
