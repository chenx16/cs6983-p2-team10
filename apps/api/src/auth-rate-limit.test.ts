import { randomBytes } from "node:crypto";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

process.env.JWT_SECRET = randomBytes(32).toString("hex");

vi.mock("./auth.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./auth.js")>();
  return {
    ...actual,
    authenticateUser: async (identifier: string, password: string) => {
      if (password !== "CorrectHorse1") return null;
      if (identifier === "first@example.com") {
        return { id: "first", username: "first", email: identifier, role: "USER", balance: 1000 };
      }
      if (identifier === "second@example.com") {
        return { id: "second", username: "second", email: identifier, role: "USER", balance: 1000 };
      }
      return null;
    },
  };
});

const { createApp } = await import("./app.js");

describe("authentication rate limiting", () => {
  it("allows repeated successful logins to a shared account", async () => {
    const app = createApp();
    for (let attempt = 0; attempt < 12; attempt++) {
      const response = await request(app).post("/api/v1/auth/login").send({
        identifier: "first@example.com",
        password: "CorrectHorse1",
      });
      expect(response.status).toBe(200);
    }
  });

  it("does not block a different account after failed logins from the same IP", async () => {
    const app = createApp();
    for (let attempt = 0; attempt < 10; attempt++) {
      const response = await request(app).post("/api/v1/auth/login").send({
        identifier: "first@example.com",
        password: "wrong-password",
      });
      expect(response.status).toBe(401);
    }

    const response = await request(app).post("/api/v1/auth/login").send({
      identifier: "second@example.com",
      password: "CorrectHorse1",
    });
    expect(response.status).toBe(200);
  });

  it("continues to limit repeated failed logins to the same account", async () => {
    const app = createApp();
    for (let attempt = 0; attempt < 10; attempt++) {
      const response = await request(app).post("/api/v1/auth/login").send({
        identifier: "first@example.com",
        password: "wrong-password",
      });
      expect(response.status).toBe(401);
    }

    const response = await request(app).post("/api/v1/auth/login").send({
      identifier: "first@example.com",
      password: "wrong-password",
    });
    expect(response.status).toBe(429);
  });

  it("does not consume the login allowance on invalid registrations", async () => {
    const app = createApp();
    for (let attempt = 0; attempt < 10; attempt++) {
      const response = await request(app).post("/api/v1/auth/register").send({});
      expect(response.status).toBe(400);
    }

    const response = await request(app).post("/api/v1/auth/login").send({
      identifier: "first@example.com",
      password: "CorrectHorse1",
    });
    expect(response.status).toBe(200);
  });
});
