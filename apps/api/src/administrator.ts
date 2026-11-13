import { QuestionStatus, Role } from "@prisma/client";
import { prisma } from "./prisma.js";

export class AdministratorActionError extends Error {
  constructor(
    public readonly code: "NOT_FOUND" | "INVALID_ACTION" | "LAST_ADMINISTRATOR",
    message: string,
  ) {
    super(message);
    this.name = "AdministratorActionError";
  }
}

export const listAdministratorUsers = () =>
  prisma.user.findMany({
    orderBy: { username: "asc" },
    select: { id: true, username: true, email: true, role: true, isActive: true },
  });

export const listAdministratorQuestions = () =>
  prisma.question.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, status: true, _count: { select: { predictions: true } } },
  });

export const changeUserRole = async (
  targetUserId: string,
  role: Role,
  reason: string,
  responsibleUserId: string,
) => prisma.$transaction(async (transaction) => {
  await transaction.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${targetUserId} FOR UPDATE`;
  const target = await transaction.user.findUnique({ where: { id: targetUserId } });
  if (!target) throw new AdministratorActionError("NOT_FOUND", "User not found.");
  if (target.role === role) throw new AdministratorActionError("INVALID_ACTION", "The user already has that role.");

  if (target.role === Role.ADMINISTRATOR && role !== Role.ADMINISTRATOR) {
    const administrators = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "User"
      WHERE "role" = 'ADMINISTRATOR' AND "isActive" = true
      FOR UPDATE
    `;
    const administratorCount = administrators.length;
    if (administratorCount <= 1) {
      throw new AdministratorActionError("LAST_ADMINISTRATOR", "The last administrator cannot be demoted.");
    }
  }

  const updated = await transaction.user.update({
    where: { id: targetUserId },
    data: { role },
  });
  await transaction.adminAudit.create({
    data: {
      action: "ROLE_CHANGE",
      targetUserId,
      previousRole: target.role,
      newRole: role,
      reason,
      responsibleUserId,
    },
  });
  return updated;
});

export const cancelQuestion = async (
  questionId: string,
  reason: string,
  responsibleUserId: string,
) => prisma.$transaction(async (transaction) => {
  await transaction.$queryRaw`SELECT "id" FROM "Question" WHERE "id" = ${questionId} FOR UPDATE`;
  const question = await transaction.question.findUnique({
    where: { id: questionId },
    include: { predictions: { select: { id: true, userId: true, creditsCharged: true } } },
  });
  if (!question) throw new AdministratorActionError("NOT_FOUND", "Question not found.");
  if (question.status === QuestionStatus.CANCELLED) {
    throw new AdministratorActionError("INVALID_ACTION", "The question is already cancelled.");
  }
  if (question.status === QuestionStatus.RESOLVED) {
    throw new AdministratorActionError("INVALID_ACTION", "A resolved question cannot be cancelled.");
  }

  await transaction.question.update({
    where: { id: questionId },
    data: { status: QuestionStatus.CANCELLED, resolutionNote: reason },
  });

  let refunded = 0;
  for (const prediction of question.predictions) {
    refunded += prediction.creditsCharged;
    await transaction.user.update({
      where: { id: prediction.userId },
      data: { balance: { increment: prediction.creditsCharged } },
    });
    await transaction.creditLedger.create({
      data: {
        userId: prediction.userId,
        type: "REFUND",
        amount: prediction.creditsCharged,
        reason: `Question cancelled: ${reason}`,
        responsibleUserId,
      },
    });
  }

  await transaction.adminAudit.create({
    data: {
      action: "QUESTION_CANCELLATION",
      questionId,
      amount: refunded,
      reason,
      responsibleUserId,
    },
  });
  return { refunded };
});
