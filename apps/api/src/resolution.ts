import { QuestionStatus, QuestionType } from "@prisma/client";
import type { ResolveAbQuestionRequest } from "@forecasthub/shared";
import { prisma } from "./prisma.js";

export class ResolutionError extends Error {
  constructor(
    public readonly code: "NOT_FOUND" | "INVALID_ACTION" | "INVALID_ANSWER",
    message: string,
  ) {
    super(message);
    this.name = "ResolutionError";
  }
}

export const listReadyToResolve = (organizerId: string) =>
  prisma.question.findMany({
    where: {
      organizerId,
      type: QuestionType.AB,
      status: { in: [QuestionStatus.OPEN, QuestionStatus.CLOSED], not: QuestionStatus.RESOLVED },
      deadline: { lte: new Date() },
    },
    orderBy: { deadline: "asc" },
    include: {
      category: { select: { name: true } },
      answers: { orderBy: { sortOrder: "asc" }, select: { id: true, text: true } },
    },
  });

export const resolveAbQuestion = (
  organizerId: string,
  questionId: string,
  input: ResolveAbQuestionRequest,
) => prisma.$transaction(async (transaction) => {
  await transaction.$queryRaw`SELECT "id" FROM "Question" WHERE "id" = ${questionId} FOR UPDATE`;
  const question = await transaction.question.findFirst({
    where: { id: questionId, organizerId },
    include: { answers: { select: { id: true } }, predictions: { orderBy: { createdAt: "asc" } } },
  });
  if (!question) throw new ResolutionError("NOT_FOUND", "Question not found.");
  if (question.type !== QuestionType.AB || question.status === QuestionStatus.DRAFT || question.status === QuestionStatus.CANCELLED) {
    throw new ResolutionError("INVALID_ACTION", "Only published A/B questions can be resolved.");
  }
  if (question.status === QuestionStatus.RESOLVED) {
    throw new ResolutionError("INVALID_ACTION", "The question has already been resolved.");
  }
  if (question.deadline > new Date()) {
    throw new ResolutionError("INVALID_ACTION", "A question can only be resolved after its deadline.");
  }
  if (!question.answers.some((answer) => answer.id === input.answerId)) {
    throw new ResolutionError("INVALID_ANSWER", "The selected answer does not belong to this question.");
  }

  const winningPredictions = question.predictions.filter((prediction) => prediction.answerId === input.answerId);
  if (winningPredictions.length === 0) {
    for (const prediction of question.predictions) {
      await transaction.user.update({
        where: { id: prediction.userId },
        data: { balance: { increment: prediction.creditsCharged } },
      });
      await transaction.creditLedger.create({
        data: {
          userId: prediction.userId,
          type: "REFUND",
          amount: prediction.creditsCharged,
          reason: `No winning predictions: ${input.evidenceNote}`,
        },
      });
    }
  } else {
    for (const prediction of winningPredictions) {
      const payout = prediction.shares?.mul(100).toNumber() ?? 0;
      if (!Number.isSafeInteger(payout) || payout < 0) {
        throw new ResolutionError("INVALID_ACTION", "Stored prediction shares are invalid.");
      }
      await transaction.user.update({
        where: { id: prediction.userId },
        data: { balance: { increment: payout } },
      });
      await transaction.creditLedger.create({
        data: {
          userId: prediction.userId,
          type: "PAYOUT",
          amount: payout,
          reason: `Correct answer payout: ${input.evidenceNote}`,
          predictionId: prediction.id,
        },
      });
    }
  }

  return transaction.question.update({
    where: { id: questionId },
    data: {
      status: QuestionStatus.RESOLVED,
      correctAnswerId: input.answerId,
      resolutionNote: input.evidenceNote,
      resolvedAt: new Date(),
    },
    include: { correctAnswer: { select: { id: true, text: true } } },
  });
});
