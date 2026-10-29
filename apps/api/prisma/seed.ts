import { PrismaClient } from "@prisma/client";
import { DEFAULT_CATEGORIES } from "@forecasthub/shared";
import { buildSeedQuestions } from "../src/arena.js";

const prisma = new PrismaClient();

await prisma.category.createMany({
  data: DEFAULT_CATEGORIES.map((name) => ({ name })),
  skipDuplicates: true,
});

const categoryRows = await prisma.category.findMany();
const categoryIdByName = new Map(categoryRows.map((row) => [row.name, row.id]));

const seedQuestions = buildSeedQuestions(new Date());

for (const item of seedQuestions) {
  const categoryId = categoryIdByName.get(item.category);
  if (!categoryId) {
    continue;
  }

  await prisma.question.upsert({
    where: { id: item.id },
    update: {},
    create: {
      id: item.id,
      title: item.title,
      categoryId,
      type: item.type,
      visibility: item.visibility,
      resolution: item.resolution,
      deadline: item.deadline,
      criteria: item.criteria,
      source: item.source,
      startingPriceA: item.startingPriceA ?? 50,
      sharesA: item.sharesA ?? 0,
      sharesB: item.sharesB ?? 0,
      totalCredits: item.totalCredits,
      creditsLast24h: item.creditsLast24h,
      correctAnswerId: item.correctAnswerId,
      answers: {
        create: item.answers.map((answer, index) => ({
          id: answer.id,
          label: answer.label,
          sortOrder: index,
          credits: answer.credits,
        })),
      },
    },
  });
}

await prisma.$disconnect();
