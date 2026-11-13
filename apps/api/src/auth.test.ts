import { randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { beforeEach, afterAll, describe, expect, it } from "vitest";
import { resetDatabase } from "./test/reset-db.js";

process.env.JWT_SECRET = randomBytes(32).toString("hex");

const { createApp } = await import("./app.js");
const prisma = new PrismaClient();

beforeEach(async () => {
  await resetDatabase(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("authentication routes", () => {
  it("rejects registration with a non-alphanumeric username without creating an account", async () => {
    const response = await request(createApp()).post("/api/v1/auth/register").send({
      username: "用户123",
      email: "invalidname@example.com",
      password: "CorrectHorse1",
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_INPUT");
    expect(await prisma.user.count()).toBe(0);
  });

  it("allows existing users with previously valid usernames to sign in", async () => {
    const { default: bcrypt } = await import("bcrypt");
    await prisma.user.create({
      data: {
        username: "old-user",
        email: "existing@example.com",
        passwordHash: await bcrypt.hash("CorrectHorse1", 12),
      },
    });

    const response = await request(createApp()).post("/api/v1/auth/login").send({
      identifier: "old-user",
      password: "CorrectHorse1",
    });
    expect(response.status).toBe(200);
    expect(response.body.user.username).toBe("old-user");
  });

  it("registers the first account as an administrator with 1,000 credits", async () => {
    const response = await request(createApp())
      .post("/api/v1/auth/register")
      .send({
        username: "firstuser",
        email: "first@example.com",
        password: "CorrectHorse1",
      });

    expect(response.status).toBe(201);
    expect(response.headers["set-cookie"]?.[0]).toContain("HttpOnly");
    expect(response.headers["set-cookie"]?.[0]).toContain("SameSite=Lax");
    expect(response.body.user).toMatchObject({
      username: "firstuser",
      email: "first@example.com",
      role: "ADMINISTRATOR",
      balance: 1000,
    });
    expect(response.body.user).not.toHaveProperty("password");
    expect(response.body.user).not.toHaveProperty("passwordHash");
  });

  it("rejects duplicate email and username without creating another account", async () => {
    const app = createApp();
    const registration = {
      username: "existinguser",
      email: "existing@example.com",
      password: "CorrectHorse1",
    };

    await request(app).post("/api/v1/auth/register").send(registration);
    const duplicate = await request(app).post("/api/v1/auth/register").send({
      ...registration,
      username: "anotheruser",
    });

    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error).toMatchObject({ code: "DUPLICATE_ACCOUNT" });
  });

  it("rejects a duplicate username with a different email", async () => {
    const app = createApp();
    await request(app).post("/api/v1/auth/register").send({
      username: "sameusername",
      email: "first-username@example.com",
      password: "CorrectHorse1",
    });

    const duplicate = await request(app).post("/api/v1/auth/register").send({
      username: "sameusername",
      email: "second-username@example.com",
      password: "CorrectHorse1",
    });

    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error).toMatchObject({ code: "DUPLICATE_ACCOUNT" });
  });

  it("stores a bcrypt password hash that matches the submitted password", async () => {
    const { default: bcrypt } = await import("bcrypt");
    const password = "CorrectHorse1";
    await request(createApp()).post("/api/v1/auth/register").send({
      username: "hashedpassworduser",
      email: "hashed-password@example.com",
      password,
    });

    const user = await prisma.user.findUnique({
      where: { email: "hashed-password@example.com" },
      select: { passwordHash: true },
    });

    expect(user).not.toBeNull();
    expect(user?.passwordHash).not.toBe(password);
    expect(user?.passwordHash).toMatch(/^\$2/);
    await expect(bcrypt.compare(password, user?.passwordHash ?? "")).resolves.toBe(true);
  });

  it("logs in with valid credentials and rejects an incorrect password", async () => {
    const app = createApp();
    const credentials = {
      identifier: "login@example.com",
      password: "CorrectHorse1",
    };

    await request(app).post("/api/v1/auth/register").send({
      email: "login@example.com",
      password: credentials.password,
      username: "loginuser",
    });

    const success = await request(app).post("/api/v1/auth/login").send(credentials);
    expect(success.status).toBe(200);
    expect(success.headers["set-cookie"]?.[0]).toContain("HttpOnly");

    const usernameLogin = await request(app).post("/api/v1/auth/login").send({
      identifier: "loginuser",
      password: credentials.password,
    });
    expect(usernameLogin.status).toBe(200);

    const failure = await request(app).post("/api/v1/auth/login").send({
      identifier: credentials.identifier,
      password: "wrong password",
    });
    expect(failure.status).toBe(401);
    expect(failure.body.error).toMatchObject({ code: "INVALID_CREDENTIALS" });
  });

  it("clears the authentication cookie when signing out", async () => {
    const response = await request(createApp()).post("/api/v1/auth/logout");

    expect(response.status).toBe(204);
    expect(response.headers["set-cookie"]?.[0]).toMatch(/Max-Age=0|Expires=/);
  });

  it("sets Secure on authentication cookies in production only", async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = "production";
      await request(createApp()).post("/api/v1/auth/register").send({
        username: "productionuser",
        email: "production@example.com",
        password: "CorrectHorse1",
      });
      const productionResponse = await request(createApp())
        .post("/api/v1/auth/login")
        .send({ identifier: "production@example.com", password: "CorrectHorse1" });
      expect(productionResponse.headers["set-cookie"]?.[0]).toContain("Secure");

      process.env.NODE_ENV = "test";
      await request(createApp()).post("/api/v1/auth/register").send({
        username: "developmentuser",
        email: "development@example.com",
        password: "CorrectHorse1",
      });
      const developmentResponse = await request(createApp())
        .post("/api/v1/auth/login")
        .send({ identifier: "development@example.com", password: "CorrectHorse1" });
      expect(developmentResponse.headers["set-cookie"]?.[0]).not.toContain("Secure");
    } finally {
      if (originalNodeEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = originalNodeEnv;
      }
    }
  });
});

describe("JWT authentication middleware", () => {
  it("accepts a valid cookie token and rejects missing, invalid, and expired tokens", async () => {
    const app = createApp();
    await request(app).post("/api/v1/auth/register").send({
      username: "jwtuser",
      email: "jwt@example.com",
      password: "CorrectHorse1",
    });
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "jwt@example.com" } });
    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET!, { expiresIn: "7d" });
    const valid = await request(app).get("/api/v1/private/me").set("Cookie", `access_token=${token}`);
    const missing = await request(app).get("/api/v1/private/me");
    const invalid = await request(app).get("/api/v1/private/me").set("Cookie", "access_token=not-a-jwt");
    const expiredToken = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET!, { expiresIn: -1 });
    const expired = await request(app).get("/api/v1/private/me").set("Cookie", `access_token=${expiredToken}`);

    expect(valid.status).toBe(200);
    expect(missing.status).toBe(401);
    expect(invalid.status).toBe(401);
    expect(expired.status).toBe(401);
  });

  it("returns the authenticated user without password fields from /me", async () => {
    const app = createApp();
    const registration = await request(app).post("/api/v1/auth/register").send({
      username: "meuser",
      email: "me@example.com",
      password: "CorrectHorse1",
    });
    const cookie = registration.headers["set-cookie"]?.[0];

    const response = await request(app).get("/api/v1/private/me").set("Cookie", cookie!);

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      username: "meuser",
      email: "me@example.com",
      balance: 1000,
    });
    expect(response.body.user).not.toHaveProperty("password");
    expect(response.body.user).not.toHaveProperty("passwordHash");
  });

  it("returns 401 from /me without a valid cookie", async () => {
    const response = await request(createApp()).get("/api/v1/private/me");

    expect(response.status).toBe(401);
  });
});
