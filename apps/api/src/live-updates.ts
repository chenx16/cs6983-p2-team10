import { QuestionStatus, QuestionType } from "@prisma/client";
import { calculatePrices, createMarket, publicQuestionPriceUpdateSchema } from "@forecasthub/shared";
import type { WebSocket } from "ws";
import { prisma } from "./prisma.js";

const subscribers = new Map<string, Set<WebSocket>>();

export const subscribeToQuestion = (questionId: string, socket: WebSocket) => {
  const sockets = subscribers.get(questionId) ?? new Set<WebSocket>();
  sockets.add(socket);
  subscribers.set(questionId, sockets);
  socket.once("close", () => {
    sockets.delete(socket);
    if (sockets.size === 0) subscribers.delete(questionId);
  });
};

export const publicQuestionCanStream = async (questionId: string) => {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: { type: true, status: true, isHidden: true, publishedAt: true },
  });
  return Boolean(
    question &&
    question.type === QuestionType.AB &&
    question.status === QuestionStatus.OPEN &&
    !question.isHidden &&
    question.publishedAt,
  );
};

export const broadcastQuestionPriceUpdate = async (questionId: string) => {
  const sockets = subscribers.get(questionId);
  if (!sockets || sockets.size === 0) return;
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { answers: { orderBy: { sortOrder: "asc" } } },
  });
  if (!question || question.type !== QuestionType.AB || question.startingPriceA === null || question.answers.length !== 2) return;
  const totals = await prisma.prediction.groupBy({
    by: ["answerId"],
    where: { questionId },
    _sum: { creditsCharged: true },
  });
  const creditsByAnswer = new Map(totals.map((total) => [total.answerId, total._sum.creditsCharged ?? 0]));
  const prices = calculatePrices({
    ...createMarket(question.startingPriceA),
    aShares: question.aSharesHundredths,
    bShares: question.bSharesHundredths,
  });
  const payload = publicQuestionPriceUpdateSchema.parse({
    questionId,
    marketVersion: question.marketVersion,
    prices: { a: prices.a, b: prices.b },
    answers: question.answers.map((answer) => ({
      id: answer.id,
      price: answer.sortOrder === 0 ? prices.a : prices.b,
      creditsSpent: creditsByAnswer.get(answer.id) ?? 0,
    })),
    totalCreditsSpent: totals.reduce((sum, total) => sum + (total._sum.creditsCharged ?? 0), 0),
  });
  const message = JSON.stringify(payload);
  for (const socket of sockets) {
    if (socket.readyState === socket.OPEN) socket.send(message);
  }
};
