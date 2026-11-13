import { QuestionStatus, QuestionType } from "@prisma/client";
import type { AbQuestionRequest } from "@forecasthub/shared";
import { prisma } from "./prisma.js";

export class OrganizerActionError extends Error {
  constructor(public readonly code: "NOT_FOUND" | "INVALID_ACTION" | "INVALID_CATEGORY" | "DEADLINE_NOT_REACHED", message: string) {
    super(message);
    this.name = "OrganizerActionError";
  }
}

const questionData = (input: AbQuestionRequest) => ({
  title: input.title,
  type: QuestionType.AB,
  categoryId: input.categoryId,
  deadline: new Date(input.deadline),
  eventTime: new Date(input.eventTime),
  outcomeCriteria: input.outcomeCriteria,
  source: input.source,
  startingPriceA: input.startingPriceA,
});

const answerData = (input: AbQuestionRequest) => [
  { text: input.answerA, sortOrder: 0 },
  { text: input.answerB, sortOrder: 1 },
];

const assertCategory = async (categoryId: string) => {
  if (!await prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } })) {
    throw new OrganizerActionError("INVALID_CATEGORY", "Category not found.");
  }
};

export const listOrganizerQuestions = (organizerId: string) =>
  prisma.question.findMany({
    where: { organizerId },
    orderBy: { updatedAt: "desc" },
    include: { category: { select: { name: true } }, answers: { orderBy: { sortOrder: "asc" }, select: { text: true } }, _count: { select: { predictions: true } } },
  });

export const listCategories = () => prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });

export const createOrganizerQuestion = async (organizerId: string, input: AbQuestionRequest) => {
  await assertCategory(input.categoryId);
  return prisma.question.create({
    data: {
      ...questionData(input),
      organizerId,
      answers: { create: answerData(input) },
    },
    include: { category: { select: { name: true } }, answers: { orderBy: { sortOrder: "asc" } } },
  });
};

export const updateOrganizerQuestion = async (organizerId: string, questionId: string, input: AbQuestionRequest) => {
  await assertCategory(input.categoryId);
  const question = await prisma.question.findFirst({ where: { id: questionId, organizerId } });
  if (!question) throw new OrganizerActionError("NOT_FOUND", "Question not found.");
  if (question.status !== QuestionStatus.DRAFT) throw new OrganizerActionError("INVALID_ACTION", "Only draft questions can be edited.");
  return prisma.$transaction(async (transaction) => {
    await transaction.answer.deleteMany({ where: { questionId } });
    return transaction.question.update({
      where: { id: questionId },
      data: { ...questionData(input), answers: { create: answerData(input) } },
      include: { category: { select: { name: true } }, answers: { orderBy: { sortOrder: "asc" } } },
    });
  });
};

export const publishOrganizerQuestion = async (organizerId: string, questionId: string) => {
  const question = await prisma.question.findFirst({ where: { id: questionId, organizerId }, include: { answers: true } });
  if (!question) throw new OrganizerActionError("NOT_FOUND", "Question not found.");
  if (question.status !== QuestionStatus.DRAFT) throw new OrganizerActionError("INVALID_ACTION", "Only draft questions can be published.");
  if (!question.title.trim() || !question.outcomeCriteria.trim() || !question.source.trim() || !question.categoryId || !question.startingPriceA || question.answers.length !== 2 || question.deadline > question.eventTime) {
    throw new OrganizerActionError("INVALID_ACTION", "Question is incomplete or invalid and cannot be published.");
  }
  return prisma.question.update({ where: { id: questionId }, data: { status: QuestionStatus.OPEN, publishedAt: new Date() } });
};

export const finalizeOrganizerQuestion = async (organizerId: string, questionId: string) => {
  const question = await prisma.question.findFirst({ where: { id: questionId, organizerId } });
  if (!question) throw new OrganizerActionError("NOT_FOUND", "Question not found.");
  if (question.status !== QuestionStatus.OPEN) throw new OrganizerActionError("INVALID_ACTION", "Only open questions can be finalized.");
  if (question.deadline > new Date()) throw new OrganizerActionError("DEADLINE_NOT_REACHED", "A question can only be finalized after its deadline.");
  return prisma.question.update({ where: { id: questionId }, data: { status: QuestionStatus.CLOSED } });
};
