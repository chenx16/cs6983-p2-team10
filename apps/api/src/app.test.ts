import { randomBytes } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";

process.env.JWT_SECRET ??= randomBytes(32).toString("hex");

const { createApp } = await import("./app.js");

describe("API health", () => {
  it("returns the public health response", async () => {
    const response = await request(createApp()).get("/api/v1/public/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.service).toBe("forecasthub-api");
  });
});
