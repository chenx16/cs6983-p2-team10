import { randomBytes } from "node:crypto";
import { PrismaClient, QuestionStatus, QuestionType, Role } from "@prisma/client";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { resetDatabase } from "./test/reset-db.js";

process.env.JWT_SECRET = randomBytes(32).toString("hex");

const prisma = new PrismaClient();
const app = createApp();

beforeEach(async () => {
  await resetDatabase(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

const register = async (username: string, email: string) => {
  const response = await request(app).post("/api/v1/auth/register").send({
    username,
    email,
    password: "CorrectHorse1",
  });
  expect(response.status).toBe(201);
  return response.headers["set-cookie"]?.[0] ?? "";
};

describe("administrator endpoints", () => {
  it("rejects non-administrators with 403", async () => {
    await register("adminuser", "admin@example.com");
    const userCookie = await register("normaluser", "user@example.com");

    const response = await request(app)
      .patch("/api/v1/private/admin/users/unknown/role")
      .set("Cookie", userCookie)
      .send({ role: "ORGANIZER", reason: "Needs organizer access" });

    expect(response.status).toBe(403);
  });

  it("changes roles and records an audit entry", async () => {
    const adminCookie = await register("adminuser", "admin@example.com");
    const userCookie = await register("normaluser", "user@example.com");
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "normaluser" } });

    const response = await request(app)
      .patch(`/api/v1/private/admin/users/${user.id}/role`)
      .set("Cookie", adminCookie)
      .send({ role: "ORGANIZER", reason: "Approved to create questions" });

    expect(response.status).toBe(200);
    expect(response.body.user.role).toBe("ORGANIZER");
    await expect(prisma.adminAudit.findFirst({ where: { targetUserId: user.id } })).resolves.toMatchObject({
      action: "ROLE_CHANGE",
      previousRole: Role.USER,
      newRole: Role.ORGANIZER,
      reason: "Approved to create questions",
    });
    expect(userCookie).toContain("access_token");
  });

  it("does not allow demoting the last administrator", async () => {
    const adminCookie = await register("adminuser", "admin@example.com");
    const admin = await prisma.user.findUniqueOrThrow({ where: { username: "adminuser" } });

    const response = await request(app)
      .patch(`/api/v1/private/admin/users/${admin.id}/role`)
      .set("Cookie", adminCookie)
      .send({ role: "USER", reason: "Test demotion" });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("LAST_ADMINISTRATOR");
  });

  it("cancels a question and refunds every original charge", async () => {
    const adminCookie = await register("adminuser", "admin@example.com");
    const userCookie = await register("normaluser", "user@example.com");
    const [admin, user, category] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { username: "adminuser" } }),
      prisma.user.findUniqueOrThrow({ where: { username: "normaluser" } }),
      prisma.category.create({ data: { name: "Sports" } }),
    ]);
    const question = await prisma.question.create({
      data: {
        title: "Will the home team win?",
        type: QuestionType.AB,
        status: QuestionStatus.OPEN,
        categoryId: category.id,
        organizerId: admin.id,
        deadline: new Date("2030-01-01T00:00:00Z"),
        eventTime: new Date("2030-01-01T01:00:00Z"),
        outcomeCriteria: "Official result",
        source: "Official source",
        answers: { create: [{ text: "Yes", sortOrder: 0 }, { text: "No", sortOrder: 1 }] },
      },
      include: { answers: true },
    });
    const answerId = question.answers[0]?.id;
    if (!answerId) throw new Error("Expected seeded question answer");
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { balance: 800 } }),
      prisma.prediction.create({
        data: {
          userId: user.id,
          questionId: question.id,
          answerId,
          creditsCharged: 200,
        },
      }),
      prisma.creditLedger.create({
        data: { userId: user.id, type: "PREDICTION", amount: -200, reason: "Prediction" },
      }),
    ]);

    const response = await request(app)
      .post(`/api/v1/private/admin/questions/${question.id}/cancel`)
      .set("Cookie", adminCookie)
      .send({ reason: "The event was cancelled." });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: "CANCELLED", refunded: 200 });
    await expect(prisma.question.findUniqueOrThrow({ where: { id: question.id } })).resolves.toMatchObject({
      status: QuestionStatus.CANCELLED,
      resolutionNote: "The event was cancelled.",
    });
    await expect(prisma.user.findUniqueOrThrow({ where: { id: user.id } })).resolves.toMatchObject({ balance: 1000 });
    await expect(prisma.creditLedger.findFirst({ where: { userId: user.id, type: "REFUND" } })).resolves.toMatchObject({
      amount: 200,
      responsibleUserId: admin.id,
    });
    await expect(prisma.adminAudit.findFirst({ where: { questionId: question.id } })).resolves.toMatchObject({
      action: "QUESTION_CANCELLATION",
      amount: 200,
      responsibleUserId: admin.id,
    });
    expect(userCookie).toContain("access_token");
  });
});
