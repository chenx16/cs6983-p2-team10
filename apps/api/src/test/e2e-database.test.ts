import { describe, expect, it } from "vitest";
import { assertE2eDatabaseUrl } from "./e2e-database.js";

describe("E2E database safety", () => {
  it("accepts only the dedicated local test database", () => {
    expect(assertE2eDatabaseUrl("postgresql://test:test@localhost:5432/forecasthub_e2e_test?schema=public"))
      .toContain("forecasthub_e2e_test");
  });

  it.each([
    undefined,
    "postgresql://test:test@production.example.com:5432/forecasthub_e2e_test",
    "postgresql://test:test@localhost:5432/forecasthub",
    "postgresql://test:test@localhost:5432/forecasthub_test",
    "postgresql://test:test@postgres:5432/forecasthub_e2e_test",
    "https://localhost/forecasthub_e2e_test",
    "postgresql://test:test@localhost:5432/forecasthub_e2e_test?host=production.example.com",
    "postgresql://test:test@localhost:5432/forecasthub_e2e_test?schema=other",
  ])("rejects unsafe database URL %s", (url) => {
    expect(() => assertE2eDatabaseUrl(url)).toThrow();
  });
});
