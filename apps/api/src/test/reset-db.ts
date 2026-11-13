import type { PrismaClient } from "@prisma/client";

const TEST_DATABASE_HOSTS = new Set(["localhost", "127.0.0.1", "postgres"]);

export const assertTestDatabaseUrl = (databaseUrl: string | undefined) => {
  let url: URL;

  try {
    url = new URL(databaseUrl ?? "");
  } catch {
    throw new Error("Refusing to reset a non-test database");
  }

  const [databaseName = ""] = decodeURIComponent(url.pathname.slice(1)).split(
    "/",
  );

  if (
    !TEST_DATABASE_HOSTS.has(url.hostname) ||
    !databaseName.endsWith("_test")
  ) {
    throw new Error("Refusing to reset a non-test database");
  }
};

export const resetDatabase = async (prisma: PrismaClient) => {
  assertTestDatabaseUrl(process.env.DATABASE_URL);

  return prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "AnswerSnapshot",
      "PriceSnapshot",
      "Prediction",
      "Answer",
      "Question",
      "Category",
      "CreditLedger",
      "User"
    RESTART IDENTITY CASCADE
  `);
};
