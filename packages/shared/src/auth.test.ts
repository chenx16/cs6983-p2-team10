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
      password: "correct horse battery staple",
    })).toEqual({
      username: "forecastor",
      email: "forecastor@example.com",
      password: "correct horse battery staple",
    });
  });

  it("rejects invalid registration input", () => {
    expect(() => registerRequestSchema.parse({
      username: "x",
      email: "not-an-email",
      password: "short",
    })).toThrow();
  });

  it("accepts login credentials", () => {
    expect(loginRequestSchema.parse({
      email: "forecastor@example.com",
      password: "correct horse battery staple",
    })).toEqual({
      email: "forecastor@example.com",
      password: "correct horse battery staple",
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
