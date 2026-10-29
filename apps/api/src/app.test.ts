import { randomBytes } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import {
  InMemoryQuestionRepository,
  createDefaultSeedQuestions,
} from "./questions.js";

process.env.JWT_SECRET ??= randomBytes(32).toString("hex");

const { createApp } = await import("./app.js");

const fixedNow = new Date("2026-10-29T18:00:00.000Z");

function buildTestApp() {
  const repository = new InMemoryQuestionRepository(
    createDefaultSeedQuestions(fixedNow),
  );
  return createApp({
    questionRepository: repository,
    now: () => fixedNow,
  });
}

describe("API health", () => {
  it("returns the public health response", async () => {
    const response = await request(buildTestApp()).get("/api/v1/public/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.service).toBe("forecasthub-api");
  });
});

describe("GET /api/v1/public/questions", () => {
  it("returns open questions (including closing soon) by default, sorted by soonest deadline", async () => {
    const response = await request(buildTestApp()).get(
      "/api/v1/public/questions",
    );

    expect(response.status).toBe(200);
    expect(response.body.questions.length).toBeGreaterThan(0);
    expect(response.body.categories).toContain("Sports");
    expect(response.body.categories).toContain("Campus Events");

    const statuses = new Set(
      response.body.questions.map((q: { status: string }) => q.status),
    );
    expect([...statuses].every((s) => s === "OPEN" || s === "CLOSING_SOON")).toBe(
      true,
    );

    const deadlines = response.body.questions.map((q: { deadline: string }) =>
      new Date(q.deadline).getTime(),
    );
    for (let i = 1; i < deadlines.length; i += 1) {
      expect(deadlines[i]).toBeGreaterThanOrEqual(deadlines[i - 1]!);
    }
  });

  it("never returns draft or hidden questions", async () => {
    const response = await request(buildTestApp())
      .get("/api/v1/public/questions")
      .query({ status: "ALL" });

    expect(response.status).toBe(200);
    const titles = response.body.questions.map(
      (q: { title: string }) => q.title,
    );
    expect(titles).not.toContain("Hidden question (should not appear)");
    expect(titles).not.toContain("Draft question (should not appear)");
  });

  it("filters by one or more categories", async () => {
    const response = await request(buildTestApp())
      .get("/api/v1/public/questions")
      .query({ category: ["Sports", "Crypto"] });

    expect(response.status).toBe(200);
    expect(response.body.questions.length).toBeGreaterThan(0);
    for (const question of response.body.questions) {
      expect(["Sports", "Crypto"]).toContain(question.category);
    }
  });

  it("filters by status (Closing soon, Closed, Resolved, Cancelled)", async () => {
    const closingSoonRes = await request(buildTestApp())
      .get("/api/v1/public/questions")
      .query({ status: "CLOSING_SOON" });

    expect(closingSoonRes.status).toBe(200);
    expect(closingSoonRes.body.questions.length).toBe(4);
    for (const q of closingSoonRes.body.questions) {
      expect(q.status).toBe("CLOSING_SOON");
      const diffMs = new Date(q.deadline).getTime() - fixedNow.getTime();
      expect(diffMs).toBeGreaterThan(0);
      expect(diffMs).toBeLessThanOrEqual(24 * 60 * 60 * 1000);
    }

    const resolvedAndCancelledRes = await request(buildTestApp())
      .get("/api/v1/public/questions")
      .query({ status: ["RESOLVED", "CANCELLED"] });

    expect(resolvedAndCancelledRes.status).toBe(200);
    expect(resolvedAndCancelledRes.body.questions.length).toBe(3);
    for (const q of resolvedAndCancelledRes.body.questions) {
      expect(["RESOLVED", "CANCELLED"]).toContain(q.status);
    }
  });

  it("filters by question type (AB vs MULTI) and formats A/B prices and top-3 Multi pool shares", async () => {
    const abRes = await request(buildTestApp())
      .get("/api/v1/public/questions")
      .query({ type: "AB" });

    expect(abRes.status).toBe(200);
    for (const q of abRes.body.questions) {
      expect(q.type).toBe("AB");
      expect(q.answers).toHaveLength(2);
      const priceA = q.answers[0].price;
      const priceB = q.answers[1].price;
      expect(priceA).toBeGreaterThanOrEqual(1);
      expect(priceA).toBeLessThanOrEqual(99);
      expect(priceA + priceB).toBe(100);
    }

    const multiRes = await request(buildTestApp())
      .get("/api/v1/public/questions")
      .query({ type: "MULTI" });

    expect(multiRes.status).toBe(200);
    expect(multiRes.body.questions.length).toBeGreaterThan(0);
    for (const q of multiRes.body.questions) {
      expect(q.type).toBe("MULTI");
      expect(q.answers.length).toBeLessThanOrEqual(3);
      expect(q.totalAnswerCount).toBeGreaterThanOrEqual(q.answers.length);
      for (const ans of q.answers) {
        expect(typeof ans.sharePct).toBe("number");
      }
    }
  });

  it("returns 400 INVALID_QUERY when given an invalid status or type filter", async () => {
    const badStatusRes = await request(buildTestApp())
      .get("/api/v1/public/questions")
      .query({ status: "NOT_A_VALID_STATUS" });

    expect(badStatusRes.status).toBe(400);
    expect(badStatusRes.body.error.code).toBe("INVALID_QUERY");

    const badTypeRes = await request(buildTestApp())
      .get("/api/v1/public/questions")
      .query({ type: "INVALID_TYPE" });

    expect(badTypeRes.status).toBe(400);
    expect(badTypeRes.body.error.code).toBe("INVALID_QUERY");
  });
});
