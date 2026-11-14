import { QuestionStatus, QuestionType, type Prisma } from "@prisma/client";
import {
  calculatePrices,
  createMarket,
  myQuestionPredictionsResponseSchema,
  predictionHistoryResponseSchema,
  questionDetailResponseSchema,
  type ArenaFilters,
} from "@forecasthub/shared";
import type { Response } from "express";
import { prisma } from "./prisma.js";
import type { AuthenticatedRequest } from "./auth.js";

const questionNotFound = (response: Response) => {
  response.status(404).json({
    error: { code: "QUESTION_NOT_FOUND", message: "Question not found." },
  });
};

const questionIdFrom = (request: AuthenticatedRequest) => {
  const questionId = request.params.questionId;
  return typeof questionId === "string" ? questionId : null;
};

const findPublicQuestion = async (questionId: string) =>
  prisma.question.findUnique({
    where: { id: questionId },
    include: {
      category: { select: { name: true } },
      answers: { orderBy: { sortOrder: "asc" } },
      correctAnswer: { select: { id: true } },
    },
  });

export const getPublicQuestionDetail = async (
  request: AuthenticatedRequest,
  response: Response,
) => {
  const questionId = questionIdFrom(request);
  if (!questionId) {
    questionNotFound(response);
    return;
  }

  const question = await findPublicQuestion(questionId);
  if (
    !question ||
    question.type !== QuestionType.AB ||
    question.isHidden ||
    !question.publishedAt
  ) {
    questionNotFound(response);
    return;
  }
  if (question.startingPriceA === null || question.answers.length !== 2) {
    response.status(422).json({
      error: { code: "INVALID_MARKET", message: "Question market is invalid." },
    });
    return;
  }

  const totals = await prisma.prediction.groupBy({
    by: ["answerId"],
    where: { questionId },
    _sum: { creditsCharged: true },
  });
  const creditsByAnswer = new Map(
    totals.map((total) => [total.answerId, total._sum.creditsCharged ?? 0]),
  );
  const prices = calculatePrices({
    ...createMarket(question.startingPriceA),
    aShares: question.aSharesHundredths,
    bShares: question.bSharesHundredths,
  });
  const result = questionDetailResponseSchema.parse({
    id: question.id,
    title: question.title,
    category: question.category.name,
    status: question.status,
    deadline: question.deadline.toISOString(),
    eventTime: question.eventTime.toISOString(),
    outcomeCriteria: question.outcomeCriteria,
    source: question.source,
    resolutionNote: question.resolutionNote,
    correctAnswerId: question.correctAnswerId,
    totalCreditsSpent: totals.reduce(
      (sum, total) => sum + (total._sum.creditsCharged ?? 0),
      0,
    ),
    answers: question.answers.map((answer) => ({
      id: answer.id,
      text: answer.text,
      price: answer.sortOrder === 0 ? prices.a : prices.b,
      creditsSpent: creditsByAnswer.get(answer.id) ?? 0,
    })),
  });

  response.json(result);
};

export const listPublicArenaQuestions = async (filters: ArenaFilters) => {
  if (filters.type === "MULTI_ANSWER") return [];
  const now = new Date();
  const where: Prisma.QuestionWhereInput = {
    type: QuestionType.AB,
    isHidden: false,
    publishedAt: { not: null },
    ...(filters.category.length ? { categoryId: { in: filters.category } } : {}),
  };
  switch (filters.status) {
    case "OPEN":
      where.status = QuestionStatus.OPEN;
      where.deadline = { gt: now };
      break;
    case "CLOSING_SOON":
      where.status = QuestionStatus.OPEN;
      where.deadline = { gt: now, lte: new Date(now.getTime() + 24 * 60 * 60 * 1000) };
      break;
    case "CLOSED":
      where.OR = [
        { status: QuestionStatus.CLOSED },
        { status: QuestionStatus.OPEN, deadline: { lte: now } },
      ];
      break;
    case "RESOLVED":
    case "CANCELLED":
      where.status = filters.status;
      break;
  }
  const questions = await prisma.question.findMany({
    where,
    orderBy: { deadline: "asc" },
    include: {
      category: { select: { name: true } },
      answers: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (questions.length === 0) return [];

  const totals = await prisma.prediction.groupBy({
    by: ["questionId", "answerId"],
    where: { questionId: { in: questions.map((question) => question.id) } },
    _sum: { creditsCharged: true },
  });
  const creditsByAnswer = new Map(
    totals.map((total) => [`${total.questionId}:${total.answerId}`, total._sum.creditsCharged ?? 0]),
  );

  return questions.map((question) => {
    if (question.startingPriceA === null || question.answers.length !== 2) return null;
    const prices = calculatePrices({
      ...createMarket(question.startingPriceA),
      aShares: question.aSharesHundredths,
      bShares: question.bSharesHundredths,
    });
    const totalCreditsSpent = question.answers.reduce(
      (sum, answer) => sum + (creditsByAnswer.get(`${question.id}:${answer.id}`) ?? 0),
      0,
    );
    return {
      id: question.id,
      title: question.title,
      category: question.category.name,
      status: question.status === QuestionStatus.OPEN && question.deadline <= now
        ? QuestionStatus.CLOSED
        : question.status,
      deadline: question.deadline.toISOString(),
      eventTime: question.eventTime.toISOString(),
      outcomeCriteria: question.outcomeCriteria,
      source: question.source,
      totalCreditsSpent,
      answers: question.answers.map((answer) => ({
        id: answer.id,
        text: answer.text,
        price: answer.sortOrder === 0 ? prices.a : prices.b,
        creditsSpent: creditsByAnswer.get(`${question.id}:${answer.id}`) ?? 0,
      })),
    };
  }).filter((question): question is NonNullable<typeof question> => question !== null);
};

export const getMyQuestionPredictions = async (
  request: AuthenticatedRequest,
  response: Response,
) => {
  const questionId = questionIdFrom(request);
  if (!questionId) {
    questionNotFound(response);
    return;
  }

  const question = await findPublicQuestion(questionId);
  if (
    !question ||
    question.type !== QuestionType.AB ||
    question.isHidden ||
    !question.publishedAt
  ) {
    questionNotFound(response);
    return;
  }
  if (!request.auth) {
    response.status(401).json({
      error: { code: "UNAUTHENTICATED", message: "Authentication is required." },
    });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: request.auth.userId },
    select: { isActive: true },
  });
  if (!user?.isActive) {
    response.status(401).json({
      error: { code: "UNAUTHENTICATED", message: "Authentication is required." },
    });
    return;
  }

  const predictions = await prisma.prediction.findMany({
    where: { questionId, userId: request.auth.userId },
    select: {
      answerId: true,
      answer: { select: { text: true } },
      creditsCharged: true,
      shares: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  const result = myQuestionPredictionsResponseSchema.parse({
    predictions: predictions.map((prediction) => {
      const shares = prediction.shares?.mul(100).toNumber() ?? 0;
      return {
        answerId: prediction.answerId,
        answerText: prediction.answer.text,
        creditsCharged: prediction.creditsCharged,
        shares,
        payoutIfCorrect: shares,
        ...(question.status === "RESOLVED"
          ? { won: prediction.answerId === question.correctAnswerId }
          : {}),
        createdAt: prediction.createdAt.toISOString(),
      };
    }),
  });

  response.json(result);
};

export const getMyPredictionHistory = async (
  request: AuthenticatedRequest,
  response: Response,
) => {
  if (!request.auth) {
    response.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Authentication is required." } });
    return;
  }
  const user = await prisma.user.findUnique({
    where: { id: request.auth.userId },
    select: { isActive: true },
  });
  if (!user?.isActive) {
    response.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Authentication is required." } });
    return;
  }
  const predictions = await prisma.prediction.findMany({
    where: { userId: request.auth.userId },
    select: {
      id: true,
      questionId: true,
      answerId: true,
      question: {
        select: {
          title: true,
          status: true,
          deadline: true,
          correctAnswerId: true,
        },
      },
      answer: { select: { text: true } },
      creditsCharged: true,
      shares: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  const resolvedQuestionIds = [...new Set(predictions
    .filter((prediction) => prediction.question.status === "RESOLVED")
    .map((prediction) => prediction.questionId))];
  const winningCounts = await prisma.prediction.groupBy({
    by: ["questionId", "answerId"],
    where: { questionId: { in: resolvedQuestionIds } },
    _count: { _all: true },
  });
  const winningCountByAnswer = new Map(
    winningCounts.map((entry) => [`${entry.questionId}:${entry.answerId}`, entry._count._all]),
  );
  response.json(predictionHistoryResponseSchema.parse({
    predictions: predictions.map((prediction) => {
      const shares = prediction.shares?.mul(100).toNumber() ?? 0;
      const resolved = prediction.question.status === "RESOLVED";
      const won = resolved && prediction.answerId === prediction.question.correctAnswerId;
      const noWinner = resolved
        && (winningCountByAnswer.get(`${prediction.questionId}:${prediction.question.correctAnswerId}`) ?? 0) === 0;
      return {
        id: prediction.id,
        questionId: prediction.questionId,
        questionTitle: prediction.question.title,
        answerText: prediction.answer.text,
        questionStatus: prediction.question.status,
        deadline: prediction.question.deadline.toISOString(),
        creditsCharged: prediction.creditsCharged,
        shares,
        outcome: !resolved ? "PENDING" : noWinner ? "REFUNDED" : won ? "WON" : "LOST",
        settlementAmount: noWinner ? prediction.creditsCharged : won ? shares : 0,
        createdAt: prediction.createdAt.toISOString(),
      };
    }),
  }));
};
