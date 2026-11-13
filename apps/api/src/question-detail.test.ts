import { randomBytes } from "node:crypto";
import { Prisma, PrismaClient, QuestionStatus, QuestionType } from "@prisma/client";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { calculatePrices, createMarket } from "@forecasthub/shared";
import { resetDatabase } from "./test/reset-db.js";

process.env.JWT_SECRET ??= randomBytes(32).toString("hex");
vi.stubEnv("PUBLIC_QUESTION_DETAIL_RATE_LIMIT", "5");

const { createApp } = await import("./app.js");
const prisma = new PrismaClient();

beforeEach(async () => {
  await resetDatabase(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
  vi.unstubAllEnvs();
});

const createScenario = async () => {
  const app = createApp();
  const registration = await request(app).post("/api/v1/auth/register").send({
    username: "question-owner",
    email: "question-owner@example.com",
    password: "CorrectHorse1",
  });
  const cookie = registration.headers["set-cookie"]?.[0];
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: "question-owner@example.com" },
  });
  const category = await prisma.category.create({ data: { name: "Detail tests" } });
  const question = await prisma.question.create({
    data: {
      title: "Will the detail test pass?",
      type: QuestionType.AB,
      status: QuestionStatus.OPEN,
      categoryId: category.id,
      organizerId: user.id,
      deadline: new Date("2030-06-01T18:00:00-07:00"),
      eventTime: new Date("2030-06-01T19:00:00-07:00"),
      outcomeCriteria: "The test result determines the outcome.",
      source: "Test source",
      startingPriceA: 50,
      publishedAt: new Date(),
      answers: {
        create: [
          { text: "Yes", sortOrder: 0 },
          { text: "No", sortOrder: 1 },
        ],
      },
    },
    include: { answers: true },
  });

  return {
    app,
    cookie,
    question,
    answerA: question.answers[0]!,
    answerB: question.answers[1]!,
    user,
  };
};

const registerOtherUser = async (app: ReturnType<typeof createApp>) => {
  const response = await request(app).post("/api/v1/auth/register").send({
    username: "other-detail-user",
    email: "other-detail-user@example.com",
    password: "CorrectHorse1",
  });
  expect(response.status).toBe(201);
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: "other-detail-user@example.com" },
  });
  return { cookie: response.headers["set-cookie"]?.[0] as string, user };
};

describe("question detail APIs", () => {
  it("returns public A/B question aggregates without individual prediction data", async () => {
    const scenario = await createScenario();
    const other = await registerOtherUser(scenario.app);
    await prisma.question.update({
      where: { id: scenario.question.id },
      data: { aSharesHundredths: 354, bSharesHundredths: 123 },
    });
    await prisma.prediction.createMany({
      data: [
        {
          userId: scenario.user.id,
          questionId: scenario.question.id,
          answerId: scenario.answerA.id,
          creditsCharged: 208,
          shares: new Prisma.Decimal("3.54"),
        },
        {
          userId: other.user.id,
          questionId: scenario.question.id,
          answerId: scenario.answerB.id,
          creditsCharged: 74,
          shares: new Prisma.Decimal("1.23"),
        },
      ],
    });
    const expectedPrices = calculatePrices({
      ...createMarket(50),
      aShares: 354,
      bShares: 123,
    });

    const response = await request(scenario.app)
      .get(`/api/v1/public/questions/${scenario.question.id}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: scenario.question.id,
      title: scenario.question.title,
      category: "Detail tests",
      status: "OPEN",
      deadline: scenario.question.deadline.toISOString(),
      eventTime: scenario.question.eventTime.toISOString(),
      outcomeCriteria: scenario.question.outcomeCriteria,
      source: scenario.question.source,
      totalCreditsSpent: 282,
      answers: [
        { id: scenario.answerA.id, text: "Yes", price: expectedPrices.a, creditsSpent: 208 },
        { id: scenario.answerB.id, text: "No", price: expectedPrices.b, creditsSpent: 74 },
      ],
    });
    expect(response.body.answers[0].price + response.body.answers[1].price).toBe(100);
    expect(JSON.stringify(response.body)).not.toContain(scenario.user.username);
    expect(JSON.stringify(response.body)).not.toContain(other.user.username);
    expect(response.body).not.toHaveProperty("predictions");
  });

  it("returns 404 for missing, hidden, and draft questions", async () => {
    const scenario = await createScenario();
    const path = `/api/v1/public/questions/${scenario.question.id}`;

    const missing = await request(scenario.app).get("/api/v1/public/questions/missing");
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe("QUESTION_NOT_FOUND");

    await prisma.question.update({
      where: { id: scenario.question.id },
      data: { isHidden: true },
    });
    const hidden = await request(scenario.app).get(path);
    expect(hidden.status).toBe(404);
    expect(hidden.body.error.code).toBe("QUESTION_NOT_FOUND");

    await prisma.question.update({
      where: { id: scenario.question.id },
      data: { isHidden: false, status: QuestionStatus.DRAFT, publishedAt: null },
    });
    const draft = await request(scenario.app).get(path);
    expect(draft.status).toBe(404);
    expect(draft.body.error.code).toBe("QUESTION_NOT_FOUND");
  });

  it("rate limits public question detail requests by IP", async () => {
    const scenario = await createScenario();
    const path = `/api/v1/public/questions/${scenario.question.id}`;

    for (let count = 0; count < 5; count++) {
      expect((await request(scenario.app).get(path)).status).toBe(200);
    }

    const limited = await request(scenario.app).get(path);
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe("RATE_LIMITED");
    expect(Number(limited.headers["retry-after"])).toBeGreaterThan(0);
  });

  it("returns only the authenticated user's predictions with shares and potential payout", async () => {
    const scenario = await createScenario();
    const other = await registerOtherUser(scenario.app);
    await prisma.prediction.createMany({
      data: [
        {
          userId: scenario.user.id,
          questionId: scenario.question.id,
          answerId: scenario.answerA.id,
          creditsCharged: 208,
          shares: new Prisma.Decimal("3.54"),
          createdAt: new Date("2029-01-02T03:04:05.000Z"),
        },
        {
          userId: other.user.id,
          questionId: scenario.question.id,
          answerId: scenario.answerB.id,
          creditsCharged: 74,
          shares: new Prisma.Decimal("1.23"),
        },
      ],
    });

    const response = await request(scenario.app)
      .get(`/api/v1/private/questions/${scenario.question.id}/predictions`)
      .set("Cookie", scenario.cookie!);

    expect(response.status).toBe(200);
    expect(response.body.predictions).toEqual([
      {
        answerId: scenario.answerA.id,
        answerText: "Yes",
        creditsCharged: 208,
        shares: 354,
        payoutIfCorrect: 354,
        createdAt: "2029-01-02T03:04:05.000Z",
      },
    ]);
  });

  it("requires authentication and returns 404 for missing questions on the private endpoint", async () => {
    const scenario = await createScenario();
    const path = `/api/v1/private/questions/${scenario.question.id}/predictions`;

    expect((await request(scenario.app).get(path)).status).toBe(401);

    const missing = await request(scenario.app)
      .get("/api/v1/private/questions/missing/predictions")
      .set("Cookie", scenario.cookie!);
    expect(missing.status).toBe(404);
  });

  it("rate limits unauthenticated private prediction-history requests by IP", async () => {
    const scenario = await createScenario();
    const path = `/api/v1/private/questions/${scenario.question.id}/predictions`;

    for (let count = 0; count < 600; count++) {
      expect((await request(scenario.app).get(path)).status).toBe(401);
    }

    const limited = await request(scenario.app).get(path);
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe("RATE_LIMITED");
    expect(Number(limited.headers["retry-after"])).toBeGreaterThan(0);
  });

  it("rate limits authenticated prediction-history requests per user", async () => {
    const scenario = await createScenario();
    const other = await registerOtherUser(scenario.app);
    const path = `/api/v1/private/questions/${scenario.question.id}/predictions`;

    for (let count = 0; count < 120; count++) {
      expect((await request(scenario.app).get(path).set("Cookie", scenario.cookie!)).status).toBe(200);
    }

    const limited = await request(scenario.app).get(path).set("Cookie", scenario.cookie!);
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe("RATE_LIMITED");
    expect(Number(limited.headers["retry-after"])).toBeGreaterThan(0);

    expect((await request(scenario.app).get(path).set("Cookie", other.cookie)).status).toBe(200);
  });
});
