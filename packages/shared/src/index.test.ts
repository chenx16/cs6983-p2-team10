import { describe, expect, it } from "vitest";
import { healthResponseSchema, roleSchema } from "./index";

describe("shared contracts", () => {
  it("accepts the API health response", () => {
    expect(healthResponseSchema.parse({
      status: "ok",
      service: "api",
      timestamp: new Date().toISOString(),
    }).status).toBe("ok");
  });

  it("limits roles to the PRD roles", () => {
    expect(roleSchema.safeParse("ADMINISTRATOR").success).toBe(true);
    expect(roleSchema.safeParse("MODERATOR").success).toBe(false);
  });
});
