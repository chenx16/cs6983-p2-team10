import { describe, expect, it } from "vitest";
import {
  authUserResponseSchema,
  loginRequestSchema,
  registerRequestSchema,
} from "./index.js";

describe("authentication contracts", () => {
  it("accepts a valid registration request", () => {
    expect(registerRequestSchema.parse({
      username: "forecastor",
      email: "forecastor@example.com",
      password: "CorrectHorse1",
    })).toEqual({
      username: "forecastor",
      email: "forecastor@example.com",
      password: "CorrectHorse1",
    });
  });

  it("rejects invalid registration input", () => {
    expect(() => registerRequestSchema.parse({
      username: "x",
      email: "not-an-email",
      password: "short",
    })).toThrow();
  });

  it.each(["User123", "abc", "ABC", "123", "a1"])(
    "accepts the alphanumeric username %s",
    (username) => {
      expect(registerRequestSchema.safeParse({
        username,
        email: "person@example.com",
        password: "CorrectHorse1",
      }).success).toBe(true);
    },
  );

  it.each(["用户名", "用户123", "éclair", "user-name", "user_name", "user name", "user!"])(
    "rejects the username %s with characters outside ASCII letters and digits",
    (username) => {
      expect(registerRequestSchema.safeParse({
        username,
        email: "person@example.com",
        password: "CorrectHorse1",
      }).success).toBe(false);
    },
  );

  it("requires at least 8 characters with letters and numbers", () => {
    expect(() => registerRequestSchema.parse({
      username: "forecastor",
      email: "forecastor@example.com",
      password: "short",
    })).toThrow();
    expect(() => registerRequestSchema.parse({
      username: "forecastor",
      email: "forecastor@example.com",
      password: "abcdefgh",
    })).toThrow();
    expect(() => registerRequestSchema.parse({
      username: "forecastor",
      email: "forecastor@example.com",
      password: "12345678",
    })).toThrow();
  });

  it("rejects a password equal to the username or email", () => {
    expect(() => registerRequestSchema.parse({
      username: "forecastor",
      email: "forecastor@example.com",
      password: "forecastor",
    })).toThrow();
    expect(() => registerRequestSchema.parse({
      username: "forecastor",
      email: "forecastor@example.com",
      password: "forecastor@example.com",
    })).toThrow();
  });

  it("accepts login credentials", () => {
    expect(loginRequestSchema.parse({
      identifier: "forecastor",
      password: "CorrectHorse1",
    })).toEqual({
      identifier: "forecastor",
      password: "CorrectHorse1",
    });
  });

  it("never permits a password in the public user response", () => {
    expect(authUserResponseSchema.parse({
      id: "user-1",
      username: "forecastor",
      email: "forecastor@example.com",
      role: "USER",
      balance: 1000,
    })).not.toHaveProperty("password");
  });
});
