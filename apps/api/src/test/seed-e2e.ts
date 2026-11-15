import { randomBytes } from "node:crypto";
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
      passwordHash: await hash(randomBytes(32).toString("hex"), 10),
      role: Role.ORGANIZER,
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
  console.log("Seeded the dedicated E2E database.");
} finally {
  await prisma.$disconnect();
}
