import { randomBytes } from "node:crypto";
import request from "supertest";
import { afterAll, expect, it, vi } from "vitest";

process.env.JWT_SECRET ??= randomBytes(32).toString("hex");
vi.stubEnv("PREDICTION_PREAUTH_RATE_LIMIT", "5");

const { createApp } = await import("./app.js");

afterAll(() => {
  vi.unstubAllEnvs();
});

it("rate limits unauthenticated requests across both prediction routes", async () => {
  const app = createApp();
  const previewPath = "/api/v1/private/questions/test/predictions/preview";
  const placementPath = "/api/v1/private/questions/test/predictions";

  for (const path of [previewPath, placementPath, previewPath, placementPath, previewPath]) {
    const response = await request(app).post(path).send({});
    expect(response.status).toBe(401);
  }

  const limited = await request(app).post(placementPath).send({});
  expect(limited.status).toBe(429);
  expect(limited.body.error.code).toBe("RATE_LIMITED");
  expect(Number(limited.headers["retry-after"])).toBeGreaterThan(0);
});
