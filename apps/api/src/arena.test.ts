import { randomBytes } from "node:crypto";
import { PrismaClient, QuestionStatus, QuestionType } from "@prisma/client";
import request from "supertest";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetDatabase } from "./test/reset-db.js";

process.env.JWT_SECRET ??= randomBytes(32).toString("hex");
const { createApp } = await import("./app.js");
const prisma = new PrismaClient();

beforeEach(async () => {
  await resetDatabase(prisma);
});

afterEach(() => {
  vi.useRealTimers();
});

afterAll(async () => {
  await prisma.$disconnect();
});

const createScenario = async () => {
  const user = await prisma.user.create({
    data: { username: "arenaowner", email: "arena@example.com", passwordHash: "test" },
  });
  const sports = await prisma.category.create({ data: { name: "Sports" } });
  const weather = await prisma.category.create({ data: { name: "Weather" } });
  const hours = (value: number) => new Date(Date.now() + value * 60 * 60 * 1000);
  const add = (title: string, categoryId: string, deadline: Date, status: QuestionStatus, isHidden = false, published = true) =>
    prisma.question.create({
      data: {
        title,
        type: QuestionType.AB,
        status,
        categoryId,
        organizerId: user.id,
        deadline,
        eventTime: deadline,
        outcomeCriteria: "Official result",
        source: "Official source",
        startingPriceA: 50,
        isHidden,
        publishedAt: published ? new Date() : null,
        answers: { create: [{ text: "Yes", sortOrder: 0 }, { text: "No", sortOrder: 1 }] },
      },
    });

  const soon = await add("Closing soon", sports.id, hours(23), QuestionStatus.OPEN);
  const later = await add("Open later", weather.id, hours(25), QuestionStatus.OPEN);
  await add("Hidden", sports.id, hours(2), QuestionStatus.OPEN, true);
  await add("Draft", sports.id, hours(1), QuestionStatus.DRAFT, false, false);
  const closed = await add("Closed", sports.id, hours(-1), QuestionStatus.CLOSED);
  const resolved = await add("Resolved", weather.id, hours(-2), QuestionStatus.RESOLVED);
  const cancelled = await add("Cancelled", sports.id, hours(3), QuestionStatus.CANCELLED);
  return { app: createApp(), sports, weather, soon, later, closed, resolved, cancelled, add };
};

describe("public Arena filters", () => {
  it("defaults to visible published open questions, ordered by deadline, without private data", async () => {
    const scenario = await createScenario();
    const response = await request(scenario.app).get("/api/v1/public/questions");
    expect(response.status).toBe(200);
    expect(response.body.questions.map((question: { id: string }) => question.id)).toEqual([
      scenario.soon.id,
      scenario.later.id,
    ]);
    for (const question of response.body.questions) {
      expect(question).not.toHaveProperty("predictions");
      expect(question).not.toHaveProperty("balance");
    }
  });

  it("filters by multiple categories and status without exposing hidden or draft questions", async () => {
    const scenario = await createScenario();
    const categories = new URLSearchParams([
      ["category", scenario.sports.id],
      ["category", scenario.weather.id],
      ["status", "OPEN"],
      ["type", "AB"],
    ]);
    const response = await request(scenario.app).get(`/api/v1/public/questions?${categories}`);
    expect(response.status).toBe(200);
    expect(response.body.questions.map((question: { id: string }) => question.id)).toEqual([
      scenario.soon.id,
      scenario.later.id,
    ]);

    const sports = await request(scenario.app).get(`/api/v1/public/questions?category=${scenario.sports.id}`);
    expect(sports.body.questions.map((question: { id: string }) => question.id)).toEqual([scenario.soon.id]);
    const multi = await request(scenario.app).get("/api/v1/public/questions?type=MULTI_ANSWER");
    expect(multi.body.questions).toEqual([]);
  });

  it("supports closing-soon, closed, resolved and cancelled filters", async () => {
    const scenario = await createScenario();
    for (const [status, expectedId] of [
      ["CLOSING_SOON", scenario.soon.id],
      ["CLOSED", scenario.closed.id],
      ["RESOLVED", scenario.resolved.id],
      ["CANCELLED", scenario.cancelled.id],
    ]) {
      const response = await request(scenario.app).get(`/api/v1/public/questions?status=${status}`);
      expect(response.status).toBe(200);
      expect(response.body.questions.map((question: { id: string }) => question.id)).toEqual([expectedId]);
    }
  });

  it("includes the 24-hour boundary but excludes expired and later deadlines from closing soon", async () => {
    vi.setSystemTime(new Date("2029-01-01T00:00:00.000Z"));
    const scenario = await createScenario();
    const boundary = await scenario.add("Boundary", scenario.sports.id, new Date("2029-01-02T00:00:00.000Z"), QuestionStatus.OPEN);
    await scenario.add("Past boundary", scenario.sports.id, new Date("2029-01-02T00:00:00.001Z"), QuestionStatus.OPEN);
    await scenario.add("At deadline", scenario.sports.id, new Date("2029-01-01T00:00:00.000Z"), QuestionStatus.OPEN);
    const response = await request(scenario.app).get("/api/v1/public/questions?status=CLOSING_SOON");
    expect(response.status).toBe(200);
    expect(response.body.questions.map((question: { id: string }) => question.id)).toEqual([
      scenario.soon.id,
      boundary.id,
    ]);
  });
});
