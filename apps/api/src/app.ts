import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import swaggerUi from "swagger-ui-express";
import {
  apiErrorSchema,
  arenaQuestionsQuerySchema,
  arenaQuestionsResponseSchema,
  healthResponseSchema,
} from "@forecasthub/shared";
import { env } from "./env.js";
import {
  InMemoryQuestionRepository,
  type QuestionRepository,
} from "./questions.js";

const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "ForecastHub API",
    version: "0.1.0",
    description:
      "Versioned API foundation for the ForecastHub prediction platform.",
  },
  servers: [{ url: "http://localhost:4000" }],
  paths: {
    "/api/v1/public/health": {
      get: {
        summary: "Check API health",
        responses: {
          "200": {
            description: "The API is ready.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HealthResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/public/questions": {
      get: {
        summary: "List Arena prediction questions with category, status, and type filters",
        description:
          "Public read-only endpoint returning open prediction questions by default (sorted by soonest deadline), with optional filters for one or more categories, statuses (OPEN, CLOSING_SOON, CLOSED, RESOLVED, CANCELLED), and question type (AB, MULTI). Draft and hidden questions are never returned.",
        parameters: [
          {
            name: "category",
            in: "query",
            required: false,
            description:
              "Filter by one or more category names (repeated query parameter or comma-separated).",
            schema: {
              oneOf: [
                { type: "string" },
                { type: "array", items: { type: "string" } },
              ],
            },
          },
          {
            name: "status",
            in: "query",
            required: false,
            description:
              "Filter by one or more statuses: OPEN, CLOSING_SOON, CLOSED, RESOLVED, CANCELLED, or ALL. Defaults to OPEN (which includes CLOSING_SOON).",
            schema: {
              oneOf: [
                { type: "string" },
                { type: "array", items: { type: "string" } },
              ],
            },
          },
          {
            name: "type",
            in: "query",
            required: false,
            description: "Filter by question type: AB or MULTI.",
            schema: {
              type: "string",
              enum: ["AB", "MULTI"],
            },
          },
        ],
        responses: {
          "200": {
            description: "Filtered list of Arena questions, available categories, and status counts.",
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
              code: { type: "string" },
              message: { type: "string" },
            },
          },
        },
      },
      QuestionAnswerSummary: {
        type: "object",
        required: ["id", "label"],
        properties: {
          id: { type: "string" },
          label: { type: "string", maxLength: 40 },
          price: { type: "integer", minimum: 1, maximum: 99 },
          credits: { type: "integer", minimum: 0 },
          sharePct: { type: "integer", minimum: 0, maximum: 100 },
          isCorrect: { type: "boolean" },
        },
      },
      ArenaQuestion: {
        type: "object",
        required: [
          "id",
          "title",
          "category",
          "type",
          "status",
          "deadline",
          "totalCredits",
          "isHot",
          "answers",
          "totalAnswerCount",
          "criteria",
          "source",
        ],
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          category: { type: "string" },
          type: { type: "string", enum: ["AB", "MULTI"] },
          status: {
            type: "string",
            enum: ["OPEN", "CLOSING_SOON", "CLOSED", "RESOLVED", "CANCELLED"],
          },
          deadline: { type: "string", format: "date-time" },
          totalCredits: { type: "integer", minimum: 0 },
          isHot: { type: "boolean" },
          answers: {
            type: "array",
            items: { $ref: "#/components/schemas/QuestionAnswerSummary" },
          },
          totalAnswerCount: { type: "integer", minimum: 2, maximum: 10 },
          correctAnswerId: { type: "string", nullable: true },
          correctAnswerLabel: { type: "string", nullable: true },
          criteria: { type: "string" },
          source: { type: "string" },
        },
      },
      ArenaQuestionsResponse: {
        type: "object",
        required: ["questions", "categories", "countsByStatus"],
        properties: {
          questions: {
            type: "array",
            items: { $ref: "#/components/schemas/ArenaQuestion" },
          },
          categories: {
            type: "array",
            items: { type: "string" },
          },
          countsByStatus: {
            type: "object",
            required: ["OPEN", "CLOSING_SOON", "CLOSED", "RESOLVED", "CANCELLED"],
            properties: {
              OPEN: { type: "integer", minimum: 0 },
              CLOSING_SOON: { type: "integer", minimum: 0 },
              CLOSED: { type: "integer", minimum: 0 },
              RESOLVED: { type: "integer", minimum: 0 },
              CANCELLED: { type: "integer", minimum: 0 },
            },
          },
        },
      },
    },
  },
};

export interface CreateAppOptions {
  questionRepository?: QuestionRepository;
  now?: () => Date;
}

export const createApp = (options: CreateAppOptions = {}) => {
  const app = express();
  const questionRepository =
    options.questionRepository ?? new InMemoryQuestionRepository();
  const getNow = options.now ?? (() => new Date());

  app.use(cors({ origin: env.WEB_ORIGIN }));
  app.use(express.json());

  app.get("/health", (_request, response) => {
    response.json(
      healthResponseSchema.parse({
        status: "ok",
        service: "forecasthub-api",
        timestamp: new Date().toISOString(),
      }),
    );
  });

  app.get("/api/v1/public/health", (_request, response) => {
    response.json(
      healthResponseSchema.parse({
        status: "ok",
        service: "forecasthub-api",
        timestamp: new Date().toISOString(),
      }),
    );
  });

  app.get("/api/v1/public/questions", async (request, response, next) => {
    try {
      const parsedQuery = arenaQuestionsQuerySchema.safeParse({
        category: request.query.category,
        status: request.query.status,
        type:
          typeof request.query.type === "string"
            ? request.query.type
            : undefined,
      });

      if (!parsedQuery.success) {
        const message =
          parsedQuery.error.issues[0]?.message ??
          "Invalid query parameters for questions list.";
        response.status(400).json(
          apiErrorSchema.parse({
            error: {
              code: "INVALID_QUERY",
              message,
            },
          }),
        );
        return;
      }

      const result = await questionRepository.listQuestions(
        parsedQuery.data,
        getNow(),
      );
      response.json(arenaQuestionsResponseSchema.parse(result));
    } catch (error) {
      next(error);
    }
  });

  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

  const errorHandler: ErrorRequestHandler = (
    error,
    _request,
    response,
    _next,
  ) => {
    console.error(error);
    response.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred.",
      },
    });
  };
  app.use(errorHandler);

  return app;
};
