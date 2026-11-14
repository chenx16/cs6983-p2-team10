import { QuestionStatus, QuestionType } from "@prisma/client";
import { leaderboardResponseSchema, type LeaderboardResponse } from "@forecasthub/shared";
import { prisma } from "./prisma.js";

export type LeaderboardPrediction = {
  userId: string;
  username: string;
  questionId: string;
  answerId: string;
  correctAnswerId: string | null;
  creditsCharged: number;
};

type UserQuestionTotal = {
  username: string;
  totalCredits: number;
  correctCredits: number;
};

export const calculateLeaderboard = (
  predictions: LeaderboardPrediction[],
): LeaderboardResponse["entries"] => {
  const totals = new Map<string, UserQuestionTotal>();
  for (const prediction of predictions) {
    const key = `${prediction.userId}:${prediction.questionId}`;
    const current = totals.get(key) ?? {
      username: prediction.username,
      totalCredits: 0,
      correctCredits: 0,
    };
    current.totalCredits += prediction.creditsCharged;
    if (prediction.answerId === prediction.correctAnswerId) {
      current.correctCredits += prediction.creditsCharged;
    }
    totals.set(key, current);
  }

  const byUser = new Map<string, { username: string; scoredQuestions: number; correctQuestions: number }>();
  for (const [key, total] of totals) {
    const userId = key.slice(0, key.indexOf(":"));
    const user = byUser.get(userId) ?? {
      username: total.username,
      scoredQuestions: 0,
      correctQuestions: 0,
    };
    user.scoredQuestions += 1;
    if (total.correctCredits * 2 > total.totalCredits) user.correctQuestions += 1;
    byUser.set(userId, user);
  }

  const entries = [...byUser.values()].map((user) => ({
    rank: null as number | null,
    username: user.username,
    scoredQuestions: user.scoredQuestions,
    successRate: Math.round((user.correctQuestions / user.scoredQuestions) * 100),
  }));
  const ranked = entries
    .filter((entry) => entry.scoredQuestions >= 5)
    .sort((left, right) =>
      right.successRate - left.successRate ||
      right.scoredQuestions - left.scoredQuestions ||
      left.username.localeCompare(right.username),
    );
  let previous: typeof ranked[number] | undefined;
  let previousRank = 0;
  ranked.forEach((entry, index) => {
    if (
      !previous ||
      previous.successRate !== entry.successRate ||
      previous.scoredQuestions !== entry.scoredQuestions
    ) {
      previousRank = index + 1;
    }
    entry.rank = previousRank;
    previous = entry;
  });

  const unranked = entries
    .filter((entry) => entry.scoredQuestions < 5)
    .sort((left, right) => left.username.localeCompare(right.username));
  return [...ranked, ...unranked];
};

export const getPublicLeaderboard = async (): Promise<LeaderboardResponse> => {
  const predictions = await prisma.prediction.findMany({
    where: {
      question: {
        type: QuestionType.AB,
        status: QuestionStatus.RESOLVED,
        correctAnswerId: { not: null },
      },
      user: { isActive: true },
    },
    select: {
      userId: true,
      user: { select: { username: true } },
      questionId: true,
      answerId: true,
      creditsCharged: true,
      question: { select: { correctAnswerId: true } },
    },
  });
  return leaderboardResponseSchema.parse({
    entries: calculateLeaderboard(predictions.map((prediction) => ({
      userId: prediction.userId,
      username: prediction.user.username,
      questionId: prediction.questionId,
      answerId: prediction.answerId,
      correctAnswerId: prediction.question.correctAnswerId,
      creditsCharged: prediction.creditsCharged,
    }))),
  });
};
