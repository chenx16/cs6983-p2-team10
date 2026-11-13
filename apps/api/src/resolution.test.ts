import { randomBytes } from "node:crypto";
import { Prisma, PrismaClient, QuestionStatus, QuestionType, Role } from "@prisma/client";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { resetDatabase } from "./test/reset-db.js";

process.env.JWT_SECRET = randomBytes(32).toString("hex");

const prisma = new PrismaClient();
const app = createApp();

beforeEach(async () => resetDatabase(prisma));
afterAll(async () => prisma.$disconnect());

const register = async (username: string, email: string) => {
  const response = await request(app).post("/api/v1/auth/register").send({
    username,
    email,
    password: "CorrectHorse1",
  });
  expect(response.status).toBe(201);
  return response.headers["set-cookie"]?.[0] ?? "";
};

describe("A/B resolution", () => {
  it("pays winning shares atomically and marks predictions as won", async () => {
    const cookie = await register("organizer", "organizer@example.com");
    const organizer = await prisma.user.findUniqueOrThrow({ where: { username: "organizer" } });
    await prisma.user.update({ where: { id: organizer.id }, data: { role: Role.ORGANIZER } });
    const participantCookie = await register("participant", "participant@example.com");
    const participant = await prisma.user.findUniqueOrThrow({ where: { username: "participant" } });
    const category = await prisma.category.create({ data: { name: "Resolution" } });
    const question = await prisma.question.create({
      data: {
        title: "Will the result be yes?",
        type: QuestionType.AB,
        status: QuestionStatus.CLOSED,
        categoryId: category.id,
        organizerId: organizer.id,
        deadline: new Date("2020-01-01T00:00:00Z"),
        eventTime: new Date("2020-01-01T01:00:00Z"),
        outcomeCriteria: "Official result",
        source: "Official source",
        startingPriceA: 50,
        publishedAt: new Date("2019-01-01T00:00:00Z"),
        answers: { create: [{ text: "Yes", sortOrder: 0 }, { text: "No", sortOrder: 1 }] },
      },
      include: { answers: true },
    });
    await prisma.user.update({ where: { id: participant.id }, data: { balance: 800 } });
    const prediction = await prisma.prediction.create({
      data: {
        userId: participant.id,
        questionId: question.id,
        answerId: question.answers[0]!.id,
        creditsCharged: 200,
        shares: new Prisma.Decimal("2.50"),
      },
    });

    const ready = await request(app)
      .get("/api/v1/private/organizer/questions/ready-to-resolve")
      .set("Cookie", cookie);
    expect(ready.status).toBe(200);
    expect(ready.body.questions).toHaveLength(1);

    const resolved = await request(app)
      .post(`/api/v1/private/organizer/questions/${question.id}/resolve`)
      .set("Cookie", cookie)
      .send({ answerId: question.answers[0]!.id, evidenceNote: "Official source confirms Yes." });
    expect(resolved.status).toBe(200);
    expect(resolved.body.question.status).toBe(QuestionStatus.RESOLVED);

    await expect(prisma.user.findUniqueOrThrow({ where: { id: participant.id } })).resolves.toMatchObject({ balance: 1050 });
    await expect(prisma.creditLedger.findUnique({ where: { predictionId: prediction.id } })).resolves.toMatchObject({ type: "PAYOUT", amount: 250 });
    const duplicate = await request(app)
      .post(`/api/v1/private/organizer/questions/${question.id}/resolve`)
      .set("Cookie", cookie)
      .send({ answerId: question.answers[0]!.id, evidenceNote: "Again." });
    expect(duplicate.status).toBe(409);
    expect(participantCookie).toBeTruthy();
  });

  it("rejects regular users from resolving questions", async () => {
    const organizerCookie = await register("organizer", "organizer@example.com");
    const organizer = await prisma.user.findUniqueOrThrow({ where: { username: "organizer" } });
    const category = await prisma.category.create({ data: { name: "Permissions" } });
    const question = await prisma.question.create({
      data: {
        title: "Permission question",
        type: QuestionType.AB,
        status: QuestionStatus.CLOSED,
        categoryId: category.id,
        organizerId: organizer.id,
        deadline: new Date("2020-01-01T00:00:00Z"),
        eventTime: new Date("2020-01-01T01:00:00Z"),
        outcomeCriteria: "Criteria",
        source: "Source",
        startingPriceA: 50,
        publishedAt: new Date("2019-01-01T00:00:00Z"),
        answers: { create: [{ text: "Yes", sortOrder: 0 }, { text: "No", sortOrder: 1 }] },
      },
      include: { answers: true },
    });
    const userCookie = await register("user", "user@example.com");
    const response = await request(app)
      .post(`/api/v1/private/organizer/questions/${question.id}/resolve`)
      .set("Cookie", userCookie)
      .send({ answerId: question.answers[0]!.id, evidenceNote: "Evidence." });
    expect(response.status).toBe(403);
    expect(organizerCookie).toBeTruthy();
  });
});
