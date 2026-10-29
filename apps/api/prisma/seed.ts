import { PrismaClient } from "@prisma/client";
import { DEFAULT_CATEGORIES } from "@forecasthub/shared";
import { createDefaultSeedQuestions } from "../src/questions.js";

const prisma = new PrismaClient();

await prisma.category.createMany({
  data: DEFAULT_CATEGORIES.map((name) => ({ name })),
  skipDuplicates: true,
});

const categoryRows = await prisma.category.findMany();
const categoryIdByName = new Map(categoryRows.map((row) => [row.name, row.id]));

const seedQuestions = createDefaultSeedQuestions();

for (const item of seedQuestions) {
  const categoryId = categoryIdByName.get(item.category);
  if (!categoryId) {
    continue;
  }

  await prisma.question.upsert({
    where: { id: item.id },
    update: {
      title: item.title,
      categoryId,
      type: item.type,
      lifecycle: item.lifecycle,
      deadline: item.deadline,
      criteria: item.criteria,
      source: item.source,
      probabilityA: item.probabilityA ?? 0.5,
      totalCredits: item.totalCredits,
      credits24h: item.credits24h,
      correctAnswerId: item.correctAnswerId ?? null,
    },
    create: {
      id: item.id,
      title: item.title,
      categoryId,
      type: item.type,
      lifecycle: item.lifecycle,
      deadline: item.deadline,
      criteria: item.criteria,
      source: item.source,
      probabilityA: item.probabilityA ?? 0.5,
      totalCredits: item.totalCredits,
      credits24h: item.credits24h,
      correctAnswerId: item.correctAnswerId ?? null,
      answers: {
        create: item.answers.map((answer, index) => ({
          id: answer.id,
          label: answer.label,
          sortOrder: index,
          credits: answer.credits ?? 0,
        })),
      },
    },
  });
}

await prisma.$disconnect();
