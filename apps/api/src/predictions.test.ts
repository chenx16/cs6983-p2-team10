import { randomBytes } from "node:crypto";
import { PrismaClient, QuestionStatus, QuestionType } from "@prisma/client";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { resetDatabase } from "./test/reset-db.js";

process.env.JWT_SECRET ??= randomBytes(32).toString("hex");

const { createApp } = await import("./app.js");
const prisma = new PrismaClient();

beforeEach(async () => {
  await resetDatabase(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

const createScenario = async () => {
  const app = createApp();
  const registration = await request(app).post("/api/v1/auth/register").send({
    username: "predictionuser",
    email: "prediction-user@example.com",
    password: "CorrectHorse1",
  });
  const cookie = registration.headers["set-cookie"]?.[0];
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: "prediction-user@example.com" },
  });
  const category = await prisma.category.create({ data: { name: "Prediction tests" } });
  const question = await prisma.question.create({
    data: {
      title: "Will the test answer win?",
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
    answerA: question.answers.find((answer) => answer.sortOrder === 0)!,
    answerB: question.answers.find((answer) => answer.sortOrder === 1)!,
    user,
  };
};

describe("prediction preview and placement", () => {
  it("rate limits preview per user without consuming the placement limit", async () => {
    const scenario = await createScenario();
    const previewPath = `/api/v1/private/questions/${scenario.question.id}/predictions/preview`;
    const placementPath = `/api/v1/private/questions/${scenario.question.id}/predictions`;
    const registration = await request(scenario.app).post("/api/v1/auth/register").send({
      username: "otheruser",
      email: "other@example.com",
      password: "CorrectHorse1",
    });
    expect(registration.status).toBe(201);
    const otherCookie = registration.headers["set-cookie"]?.[0];
    expect(otherCookie).toBeDefined();

    for (let count = 0; count < 120; count++) {
      const response = await request(scenario.app)
        .post(previewPath)
        .set("Cookie", scenario.cookie!)
        .send({});
      expect(response.status).toBe(422);
    }

    const limited = await request(scenario.app)
      .post(previewPath)
      .set("Cookie", scenario.cookie!)
      .send({});
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe("RATE_LIMITED");
    expect(Number(limited.headers["retry-after"])).toBeGreaterThan(0);

    const otherUser = await request(scenario.app)
      .post(previewPath)
      .set("Cookie", otherCookie!)
      .send({});
    expect(otherUser.status).toBe(422);

    const unauthenticated = await request(scenario.app).post(previewPath).send({});
    expect(unauthenticated.status).toBe(401);

    const placement = await request(scenario.app)
      .post(placementPath)
      .set("Cookie", scenario.cookie!)
      .send({});
    expect(placement.status).toBe(422);
  });

  it("rate limits placement per user without consuming the preview limit", async () => {
    const scenario = await createScenario();
    const previewPath = `/api/v1/private/questions/${scenario.question.id}/predictions/preview`;
    const placementPath = `/api/v1/private/questions/${scenario.question.id}/predictions`;
    const registration = await request(scenario.app).post("/api/v1/auth/register").send({
      username: "otheruser",
      email: "other@example.com",
      password: "CorrectHorse1",
    });
    expect(registration.status).toBe(201);
    const otherCookie = registration.headers["set-cookie"]?.[0];
    expect(otherCookie).toBeDefined();

    for (let count = 0; count < 120; count++) {
      const response = await request(scenario.app)
        .post(placementPath)
        .set("Cookie", scenario.cookie!)
        .send({});
      expect(response.status).toBe(422);
    }

    const limited = await request(scenario.app)
      .post(placementPath)
      .set("Cookie", scenario.cookie!)
      .send({});
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe("RATE_LIMITED");
    expect(Number(limited.headers["retry-after"])).toBeGreaterThan(0);

    const otherUser = await request(scenario.app)
      .post(placementPath)
      .set("Cookie", otherCookie!)
      .send({});
    expect(otherUser.status).toBe(422);

    const unauthenticated = await request(scenario.app).post(placementPath).send({});
    expect(unauthenticated.status).toBe(401);

    const preview = await request(scenario.app)
      .post(previewPath)
      .set("Cookie", scenario.cookie!)
      .send({});
    expect(preview.status).toBe(422);
  });

  it("previews and places an A/B prediction atomically", async () => {
    const scenario = await createScenario();
    const preview = await request(scenario.app)
      .post(`/api/v1/private/questions/${scenario.question.id}/predictions/preview`)
      .set("Cookie", scenario.cookie!)
      .send({ answerId: scenario.answerA.id, budget: 208 });

    expect(preview.status).toBe(200);
    expect(preview.body).toMatchObject({
      answerId: scenario.answerA.id,
      shares: 354,
      charge: 208,
      prices: { a: 67, b: 33 },
      balance: 1000,
    });

    const placed = await request(scenario.app)
      .post(`/api/v1/private/questions/${scenario.question.id}/predictions`)
      .set("Cookie", scenario.cookie!)
      .send({
        answerId: scenario.answerA.id,
        budget: 208,
        minShares: preview.body.shares,
        idempotencyKey: "prediction-1",
      });

    expect(placed.status).toBe(201);
    expect(placed.body.prediction).toMatchObject({
      answerId: scenario.answerA.id,
      shares: 354,
      creditsCharged: 208,
    });
    expect(placed.body.balance).toBe(792);

    const [user, prediction, ledger, question, snapshots] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: scenario.user.id } }),
      prisma.prediction.findFirstOrThrow({ where: { questionId: scenario.question.id } }),
      prisma.creditLedger.findFirstOrThrow({ where: { predictionId: placed.body.prediction.id } }),
      prisma.question.findUniqueOrThrow({ where: { id: scenario.question.id } }),
      prisma.priceSnapshot.findMany({ where: { questionId: scenario.question.id } }),
    ]);
    expect(user.balance).toBe(792);
    expect(prediction.shares?.toString()).toBe("3.54");
    expect(ledger).toMatchObject({ type: "PREDICTION", amount: -208 });
    expect(question.aSharesHundredths).toBe(354);
    expect(question.bSharesHundredths).toBe(0);
    expect(question.marketVersion).toBe(1);
    expect(snapshots).toHaveLength(1);
  });

  it("requires authentication for preview and placement", async () => {
    const scenario = await createScenario();

    const preview = await request(scenario.app)
      .post(`/api/v1/private/questions/${scenario.question.id}/predictions/preview`)
      .send({ answerId: scenario.answerA.id, budget: 10 });
    const placed = await request(scenario.app)
      .post(`/api/v1/private/questions/${scenario.question.id}/predictions`)
      .send({
        answerId: scenario.answerA.id,
        budget: 10,
        minShares: 1,
        idempotencyKey: "unauthenticated",
      });

    expect(preview.status).toBe(401);
    expect(placed.status).toBe(401);
  });

  it("rejects missing, closed, and expired questions without spending credits", async () => {
    const scenario = await createScenario();
    const missing = await request(scenario.app)
      .post("/api/v1/private/questions/missing/predictions/preview")
      .set("Cookie", scenario.cookie!)
      .send({ answerId: scenario.answerA.id, budget: 10 });
    expect(missing.status).toBe(404);

    await prisma.question.update({
      where: { id: scenario.question.id },
      data: { status: QuestionStatus.CLOSED },
    });
    const closed = await request(scenario.app)
      .post(`/api/v1/private/questions/${scenario.question.id}/predictions`)
      .set("Cookie", scenario.cookie!)
      .send({
        answerId: scenario.answerA.id,
        budget: 10,
        minShares: 1,
        idempotencyKey: "closed",
      });
    expect(closed.status).toBe(409);

    await prisma.question.update({
      where: { id: scenario.question.id },
      data: { status: QuestionStatus.OPEN, deadline: new Date("2020-01-01T00:00:00Z") },
    });
    const expired = await request(scenario.app)
      .post(`/api/v1/private/questions/${scenario.question.id}/predictions`)
      .set("Cookie", scenario.cookie!)
      .send({
        answerId: scenario.answerA.id,
        budget: 10,
        minShares: 1,
        idempotencyKey: "expired",
      });
    expect(expired.status).toBe(409);

    expect(await prisma.prediction.count()).toBe(0);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: scenario.user.id } })).balance).toBe(1000);
  });

  it("rejects low budgets and insufficient balances without writes", async () => {
    const scenario = await createScenario();
    const lowBudget = await request(scenario.app)
      .post(`/api/v1/private/questions/${scenario.question.id}/predictions/preview`)
      .set("Cookie", scenario.cookie!)
      .send({ answerId: scenario.answerA.id, budget: 9 });
    expect(lowBudget.status).toBe(422);

    await prisma.user.update({
      where: { id: scenario.user.id },
      data: { balance: 10 },
    });
    const insufficient = await request(scenario.app)
      .post(`/api/v1/private/questions/${scenario.question.id}/predictions`)
      .set("Cookie", scenario.cookie!)
      .send({
        answerId: scenario.answerA.id,
        budget: 208,
        minShares: 354,
        idempotencyKey: "insufficient",
      });
    expect(insufficient.status).toBe(422);
    expect(await prisma.prediction.count()).toBe(0);
    expect(await prisma.creditLedger.count()).toBe(1);
    const unchangedQuestion = await prisma.question.findUniqueOrThrow({
      where: { id: scenario.question.id },
    });
    expect(unchangedQuestion.aSharesHundredths).toBe(0);
    expect(unchangedQuestion.bSharesHundredths).toBe(0);
    expect(unchangedQuestion.marketVersion).toBe(0);
  });

  it("accepts a favorable price change when the recalculated shares still meet minShares", async () => {
    const scenario = await createScenario();
    const preview = await request(scenario.app)
      .post(`/api/v1/private/questions/${scenario.question.id}/predictions/preview`)
      .set("Cookie", scenario.cookie!)
      .send({ answerId: scenario.answerA.id, budget: 208 });

    await prisma.question.update({
      where: { id: scenario.question.id },
      data: { bSharesHundredths: 100 },
    });
    const placed = await request(scenario.app)
      .post(`/api/v1/private/questions/${scenario.question.id}/predictions`)
      .set("Cookie", scenario.cookie!)
      .send({
        answerId: scenario.answerA.id,
        budget: 208,
        minShares: preview.body.shares,
        idempotencyKey: "favorable-price",
      });

    expect(placed.status).toBe(201);
    expect(placed.body.prediction.shares).toBeGreaterThanOrEqual(preview.body.shares);
  });

  it("rejects an unfavorable price change without charging and returns a fresh preview", async () => {
    const scenario = await createScenario();
    const preview = await request(scenario.app)
      .post(`/api/v1/private/questions/${scenario.question.id}/predictions/preview`)
      .set("Cookie", scenario.cookie!)
      .send({ answerId: scenario.answerA.id, budget: 208 });

    await prisma.question.update({
      where: { id: scenario.question.id },
      data: { aSharesHundredths: 100 },
    });
    const placed = await request(scenario.app)
      .post(`/api/v1/private/questions/${scenario.question.id}/predictions`)
      .set("Cookie", scenario.cookie!)
      .send({
        answerId: scenario.answerA.id,
        budget: 208,
        minShares: preview.body.shares,
        idempotencyKey: "unfavorable-price",
      });

    expect(placed.status).toBe(409);
    expect(placed.body.error.code).toBe("PRICE_CHANGED");
    expect(placed.body.preview.shares).toBeLessThan(preview.body.shares);
    expect(await prisma.prediction.count()).toBe(0);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: scenario.user.id } })).balance).toBe(1000);
  });

  it("does not charge twice for a repeated idempotency key", async () => {
    const scenario = await createScenario();
    const input = {
      answerId: scenario.answerA.id,
      budget: 208,
      minShares: 354,
      idempotencyKey: "repeatable",
    };
    const first = await request(scenario.app)
      .post(`/api/v1/private/questions/${scenario.question.id}/predictions`)
      .set("Cookie", scenario.cookie!)
      .send(input);
    const second = await request(scenario.app)
      .post(`/api/v1/private/questions/${scenario.question.id}/predictions`)
      .set("Cookie", scenario.cookie!)
      .send(input);

    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.prediction.id).toBe(first.body.prediction.id);
    expect(await prisma.prediction.count()).toBe(1);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: scenario.user.id } })).balance).toBe(792);
  });

  it("returns the first result for simultaneous requests with the same idempotency key", async () => {
    const scenario = await createScenario();
    const input = {
      answerId: scenario.answerA.id,
      budget: 208,
      minShares: 354,
      idempotencyKey: "simultaneous",
    };
    const [first, second] = await Promise.all([
      request(scenario.app)
        .post(`/api/v1/private/questions/${scenario.question.id}/predictions`)
        .set("Cookie", scenario.cookie!)
        .send(input),
      request(scenario.app)
        .post(`/api/v1/private/questions/${scenario.question.id}/predictions`)
        .set("Cookie", scenario.cookie!)
        .send(input),
    ]);

    expect([first.status, second.status].sort()).toEqual([200, 201]);
    expect(first.body.prediction.id).toBe(second.body.prediction.id);
    expect(await prisma.prediction.count()).toBe(1);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: scenario.user.id } })).balance).toBe(792);
  });

  it("keeps balances and market shares consistent for concurrent placements", async () => {
    const scenario = await createScenario();
    const requests = [1, 2].map((suffix) =>
      request(scenario.app)
        .post(`/api/v1/private/questions/${scenario.question.id}/predictions`)
        .set("Cookie", scenario.cookie!)
        .send({
          answerId: suffix === 1 ? scenario.answerA.id : scenario.answerB.id,
          budget: 100,
          minShares: 1,
          idempotencyKey: `concurrent-${suffix}`,
        }),
    );
    const responses = await Promise.all(requests);

    expect(responses.every((response) => [201, 409].includes(response.status))).toBe(true);
    const [user, question, predictions] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: scenario.user.id } }),
      prisma.question.findUniqueOrThrow({ where: { id: scenario.question.id } }),
      prisma.prediction.findMany({ where: { questionId: scenario.question.id } }),
    ]);
    expect(user.balance).toBe(1000 - predictions.reduce((total, prediction) => total + prediction.creditsCharged, 0));
    expect(question.aSharesHundredths + question.bSharesHundredths).toBe(
      predictions.reduce((total, prediction) => total + Number(prediction.shares ?? 0) * 100, 0),
    );
    expect(user.balance).toBeGreaterThanOrEqual(0);
  });
});
