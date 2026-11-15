import { defineConfig, devices } from "@playwright/test";
import { assertE2eDatabaseUrl } from "./apps/api/src/test/e2e-database";

const databaseUrl = assertE2eDatabaseUrl(process.env.E2E_DATABASE_URL);
const apiUrl = "http://127.0.0.1:43017";
const webUrl = "http://127.0.0.1:43018";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    ...devices["Desktop Chrome"],
    baseURL: webUrl,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "npm run start --workspace=@forecasthub/api",
      url: `${apiUrl}/api/v1/public/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        DATABASE_URL: databaseUrl,
        API_PORT: "43017",
        WEB_ORIGIN: webUrl,
        JWT_SECRET: "e2e-test-only-secret-not-for-production",
      },
    },
    {
      command: "npm run build --workspace=@forecasthub/web && npm run start --workspace=@forecasthub/web -- --hostname 127.0.0.1 --port 43018",
      url: webUrl,
      reuseExistingServer: false,
      timeout: 180_000,
      env: { API_URL: apiUrl, NEXT_PUBLIC_API_URL: apiUrl },
    },
  ],
});
