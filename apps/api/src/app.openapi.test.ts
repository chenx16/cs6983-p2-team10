import { randomBytes } from "node:crypto";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

process.env.JWT_SECRET ??= randomBytes(32).toString("hex");
const { createApp } = await import("./app.js");

type Operation = {
  security?: Record<string, string[]>[];
  requestBody?: { content?: Record<string, { example?: unknown }> };
  responses: Record<string, { content?: Record<string, { example?: unknown }> }>;
};
type OpenApiDocument = {
  paths: Record<string, Record<string, Operation>>;
  components: { securitySchemes: Record<string, unknown> };
};

const routes = [
  ["/health", "get"],
  ["/api/v1/public/health", "get"],
  ["/api/v1/public/questions", "get"],
  ["/api/v1/public/questions/{questionId}", "get"],
  ["/api/v1/public/questions/{questionId}/stream", "get"],
  ["/api/v1/public/categories", "get"],
  ["/api/v1/public/leaderboard", "get"],
  ["/api/v1/auth/register", "post"],
  ["/api/v1/auth/login", "post"],
  ["/api/v1/auth/logout", "post"],
  ["/api/v1/private/me", "get"],
  ["/api/v1/private/predictions", "get"],
  ["/api/v1/private/questions/{questionId}/predictions", "get"],
  ["/api/v1/private/questions/{questionId}/predictions", "post"],
  ["/api/v1/private/questions/{questionId}/predictions/preview", "post"],
  ["/api/v1/private/organizer/categories", "post"],
  ["/api/v1/private/organizer/questions", "get"],
  ["/api/v1/private/organizer/questions", "post"],
  ["/api/v1/private/organizer/questions/{questionId}", "patch"],
  ["/api/v1/private/organizer/questions/{questionId}/publish", "post"],
  ["/api/v1/private/organizer/questions/{questionId}/finalize", "post"],
  ["/api/v1/private/organizer/questions/ready-to-resolve", "get"],
  ["/api/v1/private/organizer/questions/{questionId}/resolve", "post"],
  ["/api/v1/private/admin/users", "get"],
  ["/api/v1/private/admin/questions", "get"],
  ["/api/v1/private/admin/history", "get"],
  ["/api/v1/private/admin/users/{userId}/role", "patch"],
  ["/api/v1/private/admin/questions/{questionId}/cancel", "post"],
] as const;

describe("OpenAPI documentation served by Swagger", () => {
  let document: OpenApiDocument;

  beforeAll(async () => {
    const response = await request(createApp()).get("/api/docs/swagger-ui-init.js");
    expect(response.status).toBe(200);
    const options = response.text.match(/var options = ([\s\S]*?);\n/);
    expect(options).not.toBeNull();
    document = (JSON.parse(options![1]!) as { swaggerDoc: OpenApiDocument }).swaggerDoc;
  });

  it("documents every retained HTTP route and the WebSocket stream", () => {
    for (const [path, method] of routes) {
      expect.soft(document.paths[path]?.[method], `${method.toUpperCase()} ${path}`).toBeDefined();
    }
  });

  it("documents cookie authentication for every private operation", () => {
    expect(document.components.securitySchemes.cookieAuth).toMatchObject({
      type: "apiKey",
      in: "cookie",
      name: "access_token",
    });
    for (const [path, method] of routes.filter(([path]) => path.startsWith("/api/v1/private/"))) {
      expect.soft(document.paths[path]?.[method]?.security, `${method.toUpperCase()} ${path}`)
        .toContainEqual({ cookieAuth: [] });
    }
  });

  it("provides response examples and request examples where a body is required", () => {
    for (const [path, method] of routes) {
      const operation = document.paths[path]?.[method];
      if (!operation) {
        expect.soft(operation, `${method.toUpperCase()} ${path}`).toBeDefined();
        continue;
      }
      const jsonSuccess = Object.entries(operation.responses).find(([status]) => status === "200" || status === "201");
      if (jsonSuccess) {
        expect.soft(jsonSuccess[1].content?.["application/json"]?.example, `${method.toUpperCase()} ${path}`)
          .toBeDefined();
      }
      if (operation.requestBody) {
        expect.soft(operation.requestBody.content?.["application/json"]?.example, `${method.toUpperCase()} ${path}`)
          .toBeDefined();
      }
    }
  });

  it("documents prediction errors and the idempotent success response", () => {
    const path = "/api/v1/private/questions/{questionId}/predictions";
    expect(Object.keys(document.paths[path]?.post?.responses ?? {}))
      .toEqual(expect.arrayContaining(["200", "201", "401", "404", "409", "422", "429"]));
  });

  it("serves a responsive ForecastHub theme for the API reference", async () => {
    const response = await request(createApp()).get("/api/docs/");
    expect(response.status).toBe(200);
    expect(response.text).toContain("ForecastHub API Reference");
    expect(response.text).toContain(".swagger-ui .scheme-container");
    expect(response.text).toContain("@media (max-width: 640px)");
  });
});
