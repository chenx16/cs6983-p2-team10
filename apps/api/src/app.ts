import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import swaggerUi from "swagger-ui-express";
import {
  arenaQuestionsQuerySchema,
  arenaQuestionsResponseSchema,
  healthResponseSchema,
} from "@forecasthub/shared";
import {
  createInMemoryArenaStore,
  listArenaQuestions,
  type ArenaQuestionStore,
} from "./arena.js";
import { env } from "./env.js";

const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "ForecastHub API",
    version: "0.1.0",
    description: "Versioned API foundation for the ForecastHub prediction platform.",
  },
  servers: [{ url: "http://localhost:4000" }],
  paths: {
    "/api/v1/public/health": {
      get: {
        summary: "Check API health",
        responses: {
          "200": {
            description: "The API is ready.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/HealthResponse" } } },
          },
        },
      },
    },
    "/api/v1/public/questions": {
      get: {
        summary: "List Arena prediction questions with category, status, and type filters",
        description:
          "Public endpoint (no sign-in required). Returns open questions by default, sorted by soonest deadline. Never exposes private user balances, emails, or individual predictions.",
        parameters: [
          {
            name: "category",
            in: "query",
            required: false,
            description: "One or more category names (comma-separated or repeated).",
            schema: { type: "string", example: "Sports,Economics" },
          },
          {
            name: "status",
            in: "query",
            required: false,
            description:
              "One or more statuses (OPEN, CLOSING_SOON, CLOSED, RESOLVED, CANCELLED). Defaults to OPEN.",
            schema: { type: "string", default: "OPEN", example: "OPEN,CLOSING_SOON" },
          },
          {
            name: "type",
            in: "query",
            required: false,
            description: "Optional question type filter (AB or MULTI).",
            schema: { type: "string", enum: ["AB", "MULTI"] },
          },
        ],
        responses: {
          "200": {
            description: "Filtered Arena questions, available categories, and status counts.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ArenaQuestionsResponse" },
              },
            },
          },
          "400": {
            description: "Invalid query parameters.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiError" },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      HealthResponse: {
        type: "object",
        required: ["status", "service", "timestamp"],
        properties: {
          status: { type: "string", enum: ["ok"] },
          service: { type: "string" },
          timestamp: { type: "string", format: "date-time" },
        },
      },
      ApiError: {
        type: "object",
        required: ["error"],
        properties: {
          error: {
            type: "object",
            required: ["code", "message"],
            properties: {
              code: { type: "string", example: "INVALID_QUERY" },
              message: { type: "string", example: "Invalid status filter." },
            },
          },
        },
      },
      ArenaQuestionsResponse: {
        type: "object",
        required: ["questions", "categories", "statusCounts"],
        properties: {
          questions: {
            type: "array",
            items: { type: "object" },
          },
          categories: {
            type: "array",
            items: { type: "string" },
          },
          statusCounts: {
            type: "object",
            required: ["OPEN", "CLOSING_SOON", "CLOSED", "RESOLVED", "CANCELLED"],
            properties: {
              OPEN: { type: "integer" },
              CLOSING_SOON: { type: "integer" },
              CLOSED: { type: "integer" },
              RESOLVED: { type: "integer" },
              CANCELLED: { type: "integer" },
            },
          },
        },
      },
    },
  },
};

export type CreateAppOptions = {
  questionStore?: ArenaQuestionStore;
  now?: () => Date;
};

export const createApp = (options?: CreateAppOptions) => {
  const app = express();
  const nowProvider = options?.now ?? (() => new Date());
  const questionStore =
    options?.questionStore ?? createInMemoryArenaStore({ referenceTime: nowProvider() });

  app.use(cors({ origin: env.WEB_ORIGIN }));
  app.use(express.json());

  app.get("/health", (_request, response) => {
    response.json(
      healthResponseSchema.parse({
        status: "ok",
        service: "forecasthub-api",
        timestamp: nowProvider().toISOString(),
      }),
    );
  });

  app.get("/api/v1/public/health", (_request, response) => {
    response.json(
      healthResponseSchema.parse({
        status: "ok",
        service: "forecasthub-api",
        timestamp: nowProvider().toISOString(),
      }),
    );
  });

  app.get("/api/v1/public/questions", async (request, response, next) => {
    try {
      const parsedQuery = arenaQuestionsQuerySchema.safeParse(request.query);
      if (!parsedQuery.success) {
        const message =
          parsedQuery.error.issues[0]?.message ?? "Invalid query parameters.";
        response.status(400).json({
          error: {
            code: "INVALID_QUERY",
            message,
          },
        });
        return;
      }

      const result = await listArenaQuestions(
        questionStore,
        parsedQuery.data,
        nowProvider(),
      );
      response.json(arenaQuestionsResponseSchema.parse(result));
    } catch (error) {
      next(error);
    }
  });

  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

  const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
    console.error(error);
    response
      .status(500)
      .json({ error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." } });
  };
  app.use(errorHandler);

  return app;
};
