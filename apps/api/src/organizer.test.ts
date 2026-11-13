import { randomBytes } from "node:crypto";
import { PrismaClient, QuestionStatus, Role } from "@prisma/client";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { resetDatabase } from "./test/reset-db.js";

process.env.JWT_SECRET = randomBytes(32).toString("hex");

const prisma = new PrismaClient();
const app = createApp();
const input = (overrides: Record<string, unknown> = {}) => ({
  title: "Will the home team win?",
  categoryId: "category-id",
  answerA: "Yes",
  answerB: "No",
  startingPriceA: 60,
  deadline: "2030-06-01T18:00:00.000Z",
  eventTime: "2030-06-01T19:00:00.000Z",
  outcomeCriteria: "The official result determines the outcome.",
  source: "Official league results",
  ...overrides,
});

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

describe("organizer question workflow", () => {
  it("allows organizers to create drafts, publish them, and list their questions", async () => {
    const organizerCookie = await register("organizer", "organizer@example.com");
    const organizer = await prisma.user.findUniqueOrThrow({ where: { username: "organizer" } });
    await prisma.user.update({ where: { id: organizer.id }, data: { role: Role.ORGANIZER } });
    const category = await prisma.category.create({ data: { name: "Sports" } });

    const draft = await request(app)
      .post("/api/v1/private/organizer/questions")
      .set("Cookie", organizerCookie)
      .send(input({ categoryId: category.id }));
    expect(draft.status).toBe(201);
    expect(draft.body.question.status).toBe(QuestionStatus.DRAFT);
    expect(draft.body.question._count.predictions).toBe(0);
    expect(draft.body.question.category.name).toBe("Sports");

    const published = await request(app)
      .post(`/api/v1/private/organizer/questions/${draft.body.question.id}/publish`)
      .set("Cookie", organizerCookie);
    expect(published.status).toBe(200);
    expect(published.body.question.status).toBe(QuestionStatus.OPEN);

    const listed = await request(app)
      .get("/api/v1/private/organizer/questions")
      .set("Cookie", organizerCookie);
    expect(listed.status).toBe(200);
    expect(listed.body.questions).toHaveLength(1);
  });

  it("rejects non-organizers and invalid A/B setup", async () => {
    const adminCookie = await register("admin", "admin@example.com");
    const userCookie = await register("user", "user@example.com");
    const category = await prisma.category.create({ data: { name: "Sports" } });
    const forbidden = await request(app)
      .post("/api/v1/private/organizer/questions")
      .set("Cookie", userCookie)
      .send(input({ categoryId: category.id }));
    expect(forbidden.status).toBe(403);

    const invalid = await request(app)
      .post("/api/v1/private/organizer/questions")
      .set("Cookie", adminCookie)
      .send(input({ categoryId: category.id, answerB: "yes", startingPriceA: 91 }));
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.message).toContain("Answers must be unique.");
    expect(invalid.body.error.message).toContain("expected number to be <=90");
  });

  it("can edit drafts but finalizes only after the deadline", async () => {
    const organizerCookie = await register("organizer", "organizer@example.com");
    const organizer = await prisma.user.findUniqueOrThrow({ where: { username: "organizer" } });
    await prisma.user.update({ where: { id: organizer.id }, data: { role: Role.ORGANIZER } });
    const category = await prisma.category.create({ data: { name: "Sports" } });
    const draft = await request(app)
      .post("/api/v1/private/organizer/questions")
      .set("Cookie", organizerCookie)
      .send(input({ categoryId: category.id }));

    const edited = await request(app)
      .patch(`/api/v1/private/organizer/questions/${draft.body.question.id}`)
      .set("Cookie", organizerCookie)
      .send(input({ categoryId: category.id, title: "Edited question" }));
    expect(edited.status).toBe(200);
    expect(edited.body.question.title).toBe("Edited question");

    await request(app)
      .post(`/api/v1/private/organizer/questions/${draft.body.question.id}/publish`)
      .set("Cookie", organizerCookie);
    const early = await request(app)
      .post(`/api/v1/private/organizer/questions/${draft.body.question.id}/finalize`)
      .set("Cookie", organizerCookie);
    expect(early.status).toBe(409);

    await prisma.question.update({ where: { id: draft.body.question.id }, data: { deadline: new Date("2020-01-01T00:00:00Z") } });
    const finalized = await request(app)
      .post(`/api/v1/private/organizer/questions/${draft.body.question.id}/finalize`)
      .set("Cookie", organizerCookie);
    expect(finalized.status).toBe(200);
    expect(finalized.body.question.status).toBe(QuestionStatus.CLOSED);
  });
});
