import { describe, expect, it } from "vitest";
import { assertTestDatabaseUrl } from "./reset-db.js";

describe("test database reset guard", () => {
  it("rejects non-test database URLs", () => {
    expect(() =>
      assertTestDatabaseUrl(
        "postgresql://forecasthub:forecasthub@neon.example.com/forecasthub",
      ),
    ).toThrow("Refusing to reset a non-test database");
  });
});
