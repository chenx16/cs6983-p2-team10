import { PrismaClient, QuestionStatus, QuestionType, Role } from "@prisma/client";
import { hash } from "bcrypt";
import { assertE2eDatabaseUrl } from "./e2e-database.js";
import { resetDatabase } from "./reset-db.js";

const databaseUrl = assertE2eDatabaseUrl(process.env.E2E_DATABASE_URL);
process.env.DATABASE_URL = databaseUrl;
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

try {
  await resetDatabase(prisma);
  const organizer = await prisma.user.create({
    data: {
      username: "E2EOrganizer",
      email: "organizer@example.test",
      passwordHash: await hash("E2ePassword123", 10),
      role: Role.ORGANIZER,
    },
  });
  const participant = await prisma.user.create({
    data: {
      username: "E2EParticipant",
      email: "participant@example.test",
      passwordHash: await hash("E2ePassword123", 10),
    },
  });
  const category = await prisma.category.create({ data: { name: "E2E Sports" } });
  const now = Date.now();
  await prisma.question.create({
    data: {
      id: "e2e-question",
      title: "Will the E2E home team win?",
      type: QuestionType.AB,
      status: QuestionStatus.OPEN,
      categoryId: category.id,
      organizerId: organizer.id,
      deadline: new Date(now + 24 * 60 * 60 * 1000),
      eventTime: new Date(now + 48 * 60 * 60 * 1000),
      outcomeCriteria: "The final score determines the result.",
      source: "E2E test results",
      startingPriceA: 50,
      publishedAt: new Date(now),
      answers: { create: [{ text: "Yes", sortOrder: 0 }, { text: "No", sortOrder: 1 }] },
    },
  });
  for (let index = 1; index <= 5; index += 1) {
    const resolved = index < 5;
    const question = await prisma.question.create({
      data: {
        id: `e2e-resolution-${index}`,
        title: `E2E resolution question ${index}`,
        type: QuestionType.AB,
        status: resolved ? QuestionStatus.RESOLVED : QuestionStatus.CLOSED,
        categoryId: category.id,
        organizerId: organizer.id,
        deadline: new Date(now - 2 * 60 * 60 * 1000),
        eventTime: new Date(now - 60 * 60 * 1000),
        outcomeCriteria: "The E2E fixture determines the result.",
        source: "E2E test results",
        startingPriceA: 50,
        publishedAt: new Date(now - 3 * 60 * 60 * 1000),
        resolvedAt: resolved ? new Date(now - 30 * 60 * 1000) : null,
        answers: { create: [{ text: "Yes", sortOrder: 0 }, { text: "No", sortOrder: 1 }] },
      },
      include: { answers: true },
    });
    const winningAnswer = question.answers.find((answer) => answer.sortOrder === 0);
    if (!winningAnswer) throw new Error("E2E fixture answer was not created.");
    if (resolved) {
      await prisma.question.update({
        where: { id: question.id },
        data: { correctAnswerId: winningAnswer.id, resolutionNote: "E2E fixture resolution." },
      });
    }
    await prisma.prediction.create({
      data: {
        userId: participant.id,
        questionId: question.id,
        answerId: winningAnswer.id,
        creditsCharged: 100,
        shares: "1.00",
        priceAAtPurchase: "0.50000000",
        priceBAtPurchase: "0.50000000",
        idempotencyKey: `e2e-resolution-${index}`,
      },
    });
  }
  console.log("Seeded the dedicated E2E database.");
} finally {
  await prisma.$disconnect();
}
