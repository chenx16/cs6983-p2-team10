import { randomBytes, scryptSync } from "node:crypto";
import { PrismaClient, QuestionStatus, QuestionType, Role, LedgerType } from "@prisma/client";

const prisma = new PrismaClient();

const hashPassword = (password: string) => {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
};

try {
  const categories = await Promise.all(
    ["Sports", "Economics", "Weather & Climate", "Tech & Science", "Campus Events"].map((name) =>
      prisma.category.upsert({ where: { name }, update: {}, create: { name } }),
    ),
  );
  const categoryByName = new Map(categories.map((category) => [category.name, category]));

  const [organizer, user] = await Promise.all([
    prisma.user.upsert({
      where: { username: "demo-organizer" },
      update: {},
      create: {
        username: "demo-organizer",
        email: "demo-organizer@example.com",
        passwordHash: hashPassword("demo-password"),
        role: Role.ORGANIZER,
      },
    }),
    prisma.user.upsert({
      where: { username: "demo-user" },
      update: {},
      create: {
        username: "demo-user",
        email: "demo-user@example.com",
        passwordHash: hashPassword("demo-password"),
        role: Role.USER,
      },
    }),
  ]);

  for (const demoUser of [organizer, user]) {
    const hasStartingEntry = await prisma.creditLedger.findFirst({
      where: { userId: demoUser.id, type: LedgerType.STARTING, reason: "Initial demo credits" },
    });
    if (!hasStartingEntry) {
      await prisma.creditLedger.create({
        data: {
          userId: demoUser.id,
          type: LedgerType.STARTING,
          amount: 1000,
          reason: "Initial demo credits",
        },
      });
    }
  }

  const sports = categoryByName.get("Sports");
  if (!sports) throw new Error("Sports category was not created");

  const existingQuestion = await prisma.question.findFirst({
    where: { title: "Will the home team win the next game?" },
  });
  if (!existingQuestion) {
    await prisma.question.create({
      data: {
        title: "Will the home team win the next game?",
        type: QuestionType.AB,
        status: QuestionStatus.OPEN,
        categoryId: sports.id,
        organizerId: organizer.id,
        deadline: new Date("2030-06-01T18:00:00-07:00"),
        eventTime: new Date("2030-06-01T19:00:00-07:00"),
        outcomeCriteria: "The official game result determines the outcome.",
        source: "Official league results",
        startingPriceA: 50,
        publishedAt: new Date(),
        answers: {
          create: [
            { text: "Yes", sortOrder: 0 },
            { text: "No", sortOrder: 1 },
          ],
        },
      },
    });
  }
} finally {
  await prisma.$disconnect();
}
