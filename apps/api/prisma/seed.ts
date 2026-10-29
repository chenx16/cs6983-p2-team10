import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const categories = [
  "Sports",
  "Economics",
  "Weather & Climate",
  "Tech & Science",
  "Campus Events",
];

await prisma.category.createMany({
  data: categories.map((name) => ({ name })),
  skipDuplicates: true,
});

await prisma.$disconnect();
