import { assertTestDatabaseUrl } from "./reset-db.js";

export function assertE2eDatabaseUrl(databaseUrl: string | undefined): string {
  assertTestDatabaseUrl(databaseUrl);
  if (!databaseUrl) throw new Error("E2E_DATABASE_URL is required");

  const url = new URL(databaseUrl);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    url.pathname !== "/forecasthub_e2e_test" ||
    [...url.searchParams].some(([key, value]) => key !== "schema" || value !== "public") ||
    url.hash
  ) {
    throw new Error("E2E requires a dedicated local forecasthub_e2e_test database");
  }
  return databaseUrl;
}
