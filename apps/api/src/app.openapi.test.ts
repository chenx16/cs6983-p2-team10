import { describe, expect, it } from "vitest";
import { openApiDocument } from "./app.js";

describe("OpenAPI documentation", () => {
  it("documents every retained versioned HTTP endpoint", () => {
    const documentedPaths = Object.keys(openApiDocument.paths);
    expect(documentedPaths).toEqual(expect.arrayContaining([
      "/api/v1/public/health",
      "/api/v1/public/questions",
      "/api/v1/public/questions/{questionId}",
      "/api/v1/public/questions/{questionId}/stream",
      "/api/v1/public/categories",
      "/api/v1/public/leaderboard",
      "/api/v1/auth/register",
      "/api/v1/auth/login",
      "/api/v1/auth/logout",
      "/api/v1/private/me",
      "/api/v1/private/predictions",
      "/api/v1/private/questions/{questionId}/predictions",
      "/api/v1/private/questions/{questionId}/predictions/preview",
      "/api/v1/private/organizer/questions",
      "/api/v1/private/organizer/questions/{questionId}",
      "/api/v1/private/organizer/questions/{questionId}/publish",
      "/api/v1/private/organizer/questions/{questionId}/finalize",
      "/api/v1/private/organizer/questions/ready-to-resolve",
      "/api/v1/private/organizer/questions/{questionId}/resolve",
      "/api/v1/private/admin/users",
      "/api/v1/private/admin/questions",
      "/api/v1/private/admin/history",
      "/api/v1/private/admin/users/{userId}/role",
      "/api/v1/private/admin/questions/{questionId}/cancel",
    ]));
  });

  it("documents authentication and rate-limit response conventions", () => {
    expect(openApiDocument.components.securitySchemes.cookieAuth).toMatchObject({
      type: "apiKey",
      in: "cookie",
      name: "access_token",
    });
    expect(openApiDocument.components.responses.RateLimited.description).toContain("Retry-After");
  });
});
