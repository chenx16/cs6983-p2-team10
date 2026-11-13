import { Prisma, QuestionStatus, QuestionType } from "@prisma/client";
import {
  calculatePrices,
  calculatePurchaseForBudget,
  createMarket,
  placePredictionRequestSchema,
  predictionPreviewRequestSchema,
  type LmsrAnswer,
} from "@forecasthub/shared";
import type { Response } from "express";
import { prisma } from "./prisma.js";
import type { AuthenticatedRequest } from "./auth.js";

const errorResponse = (
  response: Response,
  status: number,
  code: string,
  message: string,
  extra?: Record<string, unknown>,
) => {
  response.status(status).json({ error: { code, message }, ...extra });
};

const questionIdFrom = (request: AuthenticatedRequest): string => {
  const questionId = request.params.questionId;
  if (typeof questionId !== "string") {
    throw new PredictionError(404, "QUESTION_NOT_FOUND", "Question not found.");
  }
  return questionId;
};

const getQuestion = async (questionId: string) =>
  prisma.question.findUnique({
    where: { id: questionId },
    include: { answers: { orderBy: { sortOrder: "asc" } } },
  });

const validateQuestion = (
  question: Awaited<ReturnType<typeof getQuestion>>,
  now = new Date(),
) => {
  if (!question) {
    return { status: 404, code: "QUESTION_NOT_FOUND", message: "Question not found." };
  }
  if (question.type !== QuestionType.AB) {
    return { status: 422, code: "INVALID_QUESTION_TYPE", message: "Only A/B questions accept predictions." };
  }
  if (question.status !== QuestionStatus.OPEN) {
    return { status: 409, code: "QUESTION_NOT_OPEN", message: "This question is not open for predictions." };
  }
  if (question.deadline <= now) {
    return { status: 409, code: "QUESTION_CLOSED", message: "The prediction deadline has passed." };
  }
  if (question.startingPriceA === null) {
    return { status: 422, code: "INVALID_MARKET", message: "This question has no starting price." };
  }
  if (question.answers.length !== 2) {
    return { status: 422, code: "INVALID_MARKET", message: "This question must have exactly two answers." };
  }
  return null;
};

const answerForId = (
  question: NonNullable<Awaited<ReturnType<typeof getQuestion>>>,
  answerId: string,
): LmsrAnswer | null => {
  const answer = question.answers.find((candidate) => candidate.id === answerId);
  if (!answer) return null;
  return answer.sortOrder === 0 ? "A" : answer.sortOrder === 1 ? "B" : null;
};

const toMarket = (question: NonNullable<Awaited<ReturnType<typeof getQuestion>>>) =>
  createMarket(question.startingPriceA ?? 50) && {
    startingPriceA: question.startingPriceA ?? 50,
    aShares: question.aSharesHundredths,
    bShares: question.bSharesHundredths,
  };

const buildPreview = async (
  question: NonNullable<Awaited<ReturnType<typeof getQuestion>>>,
  answerId: string,
  budget: number,
  balance: number,
) => {
  const answer = answerForId(question, answerId);
  if (!answer) {
    throw new PredictionError(422, "INVALID_ANSWER", "Answer does not belong to this A/B question.");
  }
  if (budget > balance) {
    throw new PredictionError(422, "INSUFFICIENT_BALANCE", "Your balance is not enough for this budget.");
  }

  const purchase = calculatePurchaseForBudget(toMarket(question), answer, budget);
  return {
    questionId: question.id,
    answerId,
    shares: purchase.shares,
    charge: purchase.charge,
    averagePrice: purchase.averagePrice,
    prices: purchase.prices,
    payoutIfCorrect: purchase.shares,
    balance,
    marketVersion: question.marketVersion,
  };
};

class PredictionError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly extra?: Record<string, unknown>,
  ) {
    super(message);
  }
}

const sendPredictionError = (response: Response, error: unknown) => {
  if (error instanceof PredictionError) {
    errorResponse(response, error.status, error.code, error.message, error.extra);
    return;
  }
  throw error;
};

export const previewPrediction = async (
  request: AuthenticatedRequest,
  response: Response,
) => {
  const parsed = predictionPreviewRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    errorResponse(response, 422, "INVALID_INPUT", "Answer and budget are invalid.");
    return;
  }
  const question = await getQuestion(questionIdFrom(request));
  const questionError = validateQuestion(question);
  if (questionError) {
    errorResponse(response, questionError.status, questionError.code, questionError.message);
    return;
  }
  const user = await prisma.user.findUnique({
    where: { id: request.auth!.userId },
    select: { balance: true, isActive: true },
  });
  if (!user?.isActive) {
    errorResponse(response, 401, "UNAUTHENTICATED", "Authentication is required.");
    return;
  }

  try {
    response.json(await buildPreview(question!, parsed.data.answerId, parsed.data.budget, user.balance));
  } catch (error) {
    sendPredictionError(response, error);
  }
};

const lockQuestion = async (
  transaction: Prisma.TransactionClient,
  questionId: string,
) => {
  await transaction.$queryRaw`SELECT "id" FROM "Question" WHERE "id" = ${questionId} FOR UPDATE`;
  return transaction.question.findUnique({
    where: { id: questionId },
    include: { answers: { orderBy: { sortOrder: "asc" } } },
  });
};

const lockUser = async (
  transaction: Prisma.TransactionClient,
  userId: string,
) => {
  await transaction.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
  return transaction.user.findUnique({ where: { id: userId } });
};

const predictionResponse = (prediction: {
  id: string;
  answerId: string;
  shares: Prisma.Decimal | null;
  creditsCharged: number;
  priceAAtPurchase: Prisma.Decimal | null;
  priceBAtPurchase: Prisma.Decimal | null;
  createdAt: Date;
}, balance: number) => ({
  prediction: {
    id: prediction.id,
    answerId: prediction.answerId,
    shares: Number(prediction.shares ?? 0) * 100,
    creditsCharged: prediction.creditsCharged,
    priceA: Number(prediction.priceAAtPurchase ?? 0),
    priceB: Number(prediction.priceBAtPurchase ?? 0),
    createdAt: prediction.createdAt.toISOString(),
  },
  balance,
});

export const placePrediction = async (
  request: AuthenticatedRequest,
  response: Response,
) => {
  const parsed = placePredictionRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    errorResponse(response, 422, "INVALID_INPUT", "Prediction details are invalid.");
    return;
  }
  const { answerId, budget, minShares, idempotencyKey } = parsed.data;
  const userId = request.auth!.userId;

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const question = await lockQuestion(transaction, questionIdFrom(request));
      const questionError = validateQuestion(question);
      if (questionError) {
        throw new PredictionError(questionError.status, questionError.code, questionError.message);
      }

      const existing = await transaction.prediction.findUnique({
        where: { userId_idempotencyKey: { userId, idempotencyKey } },
      });
      if (existing) {
        const user = await transaction.user.findUniqueOrThrow({ where: { id: userId } });
        return { status: 200, body: predictionResponse(existing, user.balance) };
      }

      const user = await lockUser(transaction, userId);
      if (!user?.isActive) {
        throw new PredictionError(401, "UNAUTHENTICATED", "Authentication is required.");
      }

      const preview = await buildPreview(question!, answerId, budget, user.balance);
      if (preview.shares < minShares) {
        throw new PredictionError(409, "PRICE_CHANGED", "The price changed before your prediction was placed.", {
          preview,
        });
      }

      const answer = answerForId(question!, answerId);
      if (!answer) {
        throw new PredictionError(422, "INVALID_ANSWER", "Answer does not belong to this A/B question.");
      }
      const market = toMarket(question!);
      const prices = calculatePrices({
        ...market,
        ...(answer === "A"
          ? { aShares: market.aShares + preview.shares }
          : { bShares: market.bShares + preview.shares }),
      });
      const prediction = await transaction.prediction.create({
        data: {
          userId,
          questionId: question!.id,
          answerId,
          creditsCharged: preview.charge,
          shares: preview.shares / 100,
          priceAAtPurchase: prices.a,
          priceBAtPurchase: prices.b,
          idempotencyKey,
        },
      });
      await transaction.creditLedger.create({
        data: {
          userId,
          type: "PREDICTION",
          amount: -preview.charge,
          reason: "Prediction placed",
          predictionId: prediction.id,
        },
      });
      await transaction.user.update({
        where: { id: userId },
        data: { balance: { decrement: preview.charge } },
      });
      await transaction.question.update({
        where: { id: question!.id },
        data: {
          ...(answer === "A"
            ? { aSharesHundredths: { increment: preview.shares } }
            : { bSharesHundredths: { increment: preview.shares } }),
          marketVersion: { increment: 1 },
        },
      });
      await transaction.priceSnapshot.create({
        data: {
          questionId: question!.id,
          priceA: prices.a,
          priceB: prices.b,
        },
      });

      const updatedUser = await transaction.user.findUniqueOrThrow({ where: { id: userId } });
      return { status: 201, body: predictionResponse(prediction, updatedUser.balance) };
    });
    response.status(result.status).json(result.body);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.prediction.findUnique({
        where: { userId_idempotencyKey: { userId, idempotencyKey } },
      });
      if (existing) {
        const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
        response.status(200).json(predictionResponse(existing, user.balance));
        return;
      }
    }
    if (error instanceof PredictionError) {
      errorResponse(response, error.status, error.code, error.message, error.extra);
      return;
    }
    throw error;
  }
};
