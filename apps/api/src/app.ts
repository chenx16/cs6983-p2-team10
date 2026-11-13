import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import { healthResponseSchema, loginRequestSchema, questionCancellationRequestSchema, registerRequestSchema, roleChangeRequestSchema } from "@forecasthub/shared";
import { authenticateUser, clearAuthCookie, createAccessToken, publicUser, registerUser, requireAdministrator, requireAuth, setAuthCookie, type AuthenticatedRequest } from "./auth.js";
import { AdministratorActionError, cancelQuestion, changeUserRole, listAdministratorQuestions, listAdministratorUsers } from "./administrator.js";
import { env } from "./env.js";
import { prisma } from "./prisma.js";
import { placePrediction, previewPrediction } from "./predictions.js";
import { getMyQuestionPredictions, getPublicQuestionDetail } from "./question-detail.js";

const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "ForecastHub API",
    version: "0.1.0",
    description: "Versioned API foundation for the ForecastHub prediction platform.",
  },
  servers: [{ url: "/" }],
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
        "/api/v1/public/questions/{questionId}": {
          get: {
            summary: "Get public A/B question details and crowd aggregates",
            parameters: [{
              name: "questionId",
              in: "path",
              required: true,
              schema: { type: "string" },
            }],
            responses: {
              "200": {
                description: "Public question details and aggregate prediction data.",
                content: { "application/json": { schema: { $ref: "#/components/schemas/QuestionDetailResponse" } } },
              },
              "404": { description: "Question not found." },
              "429": { description: "Rate limit exceeded." },
            },
          },
        },
        "/api/v1/private/questions/{questionId}/predictions": {
          get: {
            summary: "Get the authenticated user's predictions for a question",
            security: [{ cookieAuth: [] }],
            parameters: [{
              name: "questionId",
              in: "path",
              required: true,
              schema: { type: "string" },
            }],
            responses: {
              "200": {
                description: "The authenticated user's predictions.",
                content: { "application/json": { schema: { $ref: "#/components/schemas/MyQuestionPredictionsResponse" } } },
              },
              "401": { description: "Authentication required." },
              "404": { description: "Question not found." },
              "429": { description: "Rate limit exceeded." },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "access_token",
      },
    },
    schemas: {
      HealthResponse: {
        type: "object",
        required: ["status", "service", "timestamp"],
        properties: {
          status: { type: "string", enum: ["ok"] },
          service: { type: "string" },
          timestamp: { type: "string", format: "date-time" },
        },
        QuestionDetailResponse: {
          type: "object",
          description: "Public question data and aggregate predictions; no individual prediction details.",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            category: { type: "string" },
            status: { type: "string" },
            deadline: { type: "string", format: "date-time" },
            eventTime: { type: "string", format: "date-time" },
            outcomeCriteria: { type: "string" },
            source: { type: "string" },
            totalCreditsSpent: { type: "integer" },
            answers: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  text: { type: "string" },
                  price: { type: "integer" },
                  creditsSpent: { type: "integer" },
                },
              },
            },
          },
        },
        MyQuestionPredictionsResponse: {
          type: "object",
          properties: {
            predictions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  answerId: { type: "string" },
                  answerText: { type: "string" },
                  creditsCharged: { type: "integer" },
                  shares: { type: "integer", description: "Hundredths of a share." },
                  payoutIfCorrect: { type: "integer", description: "Credits." },
                  createdAt: { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
      },
    },
  },
};

export const createApp = () => {
  const app = express();
  const predictionRateLimitKey = (request: AuthenticatedRequest) => {
    if (!request.auth) {
      throw new Error("Prediction rate limiting requires authentication.");
    }
    return request.auth.userId;
  };
  const authMutationRateLimit = rateLimit({
    handler: (_request, response) => {
      response.status(429).json({ error: { code: "RATE_LIMITED", message: "Too many authentication attempts. Try again later." } });
    },
    legacyHeaders: false,
    max: 10,
    standardHeaders: true,
    windowMs: 15 * 60 * 1000,
  });
  const authSessionRateLimit = rateLimit({
    handler: (_request, response) => {
      response.status(429).json({ error: { code: "RATE_LIMITED", message: "Too many authentication requests. Try again later." } });
    },
    legacyHeaders: false,
    max: 100,
    standardHeaders: true,
    windowMs: 15 * 60 * 1000,
  });
  const predictionPreAuthRateLimit = rateLimit({
    handler: (_request, response) => {
      response.status(429).json({ error: { code: "RATE_LIMITED", message: "Too many prediction requests. Try again later." } });
    },
    legacyHeaders: false,
    max: env.PREDICTION_PREAUTH_RATE_LIMIT,
    standardHeaders: true,
    windowMs: 60 * 1000,
  });
  const publicQuestionDetailRateLimit = rateLimit({
    handler: (_request, response) => {
      response.status(429).json({ error: { code: "RATE_LIMITED", message: "Too many question detail requests. Try again later." } });
    },
    legacyHeaders: false,
    max: env.PUBLIC_QUESTION_DETAIL_RATE_LIMIT,
    standardHeaders: true,
    windowMs: 60 * 1000,
  });
  const predictionPreviewRateLimit = rateLimit({
    handler: (_request, response) => {
      response.status(429).json({ error: { code: "RATE_LIMITED", message: "Too many preview requests. Try again later." } });
    },
    keyGenerator: predictionRateLimitKey,
    legacyHeaders: false,
    max: 120,
    standardHeaders: true,
    windowMs: 60 * 1000,
  });
  const predictionPlacementRateLimit = rateLimit({
    handler: (_request, response) => {
      response.status(429).json({ error: { code: "RATE_LIMITED", message: "Too many prediction requests. Try again later." } });
    },
    keyGenerator: predictionRateLimitKey,
    legacyHeaders: false,
    max: 120,
    standardHeaders: true,
    windowMs: 60 * 1000,
  });
  const myQuestionPredictionsRateLimit = rateLimit({
    handler: (_request, response) => {
      response.status(429).json({ error: { code: "RATE_LIMITED", message: "Too many prediction history requests. Try again later." } });
    },
    keyGenerator: predictionRateLimitKey,
    legacyHeaders: false,
    max: 120,
    standardHeaders: true,
    windowMs: 60 * 1000,
  });
  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
  app.use(express.json());

  app.get("/health", (_request, response) => {
    response.json(healthResponseSchema.parse({
      status: "ok",
      service: "forecasthub-api",
      timestamp: new Date().toISOString(),
    }));
  });

  app.get("/api/v1/public/health", (_request, response) => {
    response.json(healthResponseSchema.parse({
      status: "ok",
      service: "forecasthub-api",
      timestamp: new Date().toISOString(),
    }));
  });

  app.get("/api/v1/public/questions/:questionId", publicQuestionDetailRateLimit, async (request: AuthenticatedRequest, response, next) => {
    try {
      await getPublicQuestionDetail(request, response);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/auth/register", authMutationRateLimit, async (request, response, next) => {
    const parsed = registerRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: { code: "INVALID_INPUT", message: "Username, email, and password are invalid." } });
      return;
    }
    try {
      const user = await registerUser(parsed.data);
      setAuthCookie(response, createAccessToken({ userId: user.id, role: user.role }));
      response.status(201).json({ user: publicUser(user) });
    } catch (error) {
      if (error instanceof Error && error.name === "DUPLICATE_ACCOUNT") {
        response.status(409).json({ error: { code: "DUPLICATE_ACCOUNT", message: error.message } });
        return;
      }
      next(error);
    }
  });

  app.post("/api/v1/auth/login", authMutationRateLimit, async (request, response, next) => {
    const parsed = loginRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: { code: "INVALID_INPUT", message: "Username or email and password are invalid." } });
      return;
    }
    try {
      const user = await authenticateUser(parsed.data.identifier, parsed.data.password);
      if (!user) {
        response.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: "Username/email or password is incorrect." } });
        return;
      }
      setAuthCookie(response, createAccessToken({ userId: user.id, role: user.role }));
      response.json({ user: publicUser(user) });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/auth/logout", authSessionRateLimit, (_request, response) => {
    clearAuthCookie(response);
    response.status(204).send();
  });

  app.get("/api/v1/private/me", authSessionRateLimit, requireAuth, async (request: AuthenticatedRequest, response, next) => {
    try {
      if (!request.auth) {
        response.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Authentication is required." } });
        return;
      }
      const user = await prisma.user.findUnique({ where: { id: request.auth.userId } });
      if (!user || !user.isActive) {
        response.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Authentication is required." } });
        return;
      }
      response.json({ user: publicUser(user) });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/private/questions/:questionId/predictions", predictionPreAuthRateLimit, requireAuth, myQuestionPredictionsRateLimit, async (request: AuthenticatedRequest, response, next) => {
    try {
      await getMyQuestionPredictions(request, response);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/private/questions/:questionId/predictions/preview", predictionPreAuthRateLimit, requireAuth, predictionPreviewRateLimit, async (request: AuthenticatedRequest, response, next) => {
    try {
      await previewPrediction(request, response);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/private/questions/:questionId/predictions", predictionPreAuthRateLimit, requireAuth, predictionPlacementRateLimit, async (request: AuthenticatedRequest, response, next) => {
    try {
      await placePrediction(request, response);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/private/admin/users", requireAuth, requireAdministrator, async (_request, response, next) => {
    try {
      response.json({ users: await listAdministratorUsers() });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/private/admin/questions", requireAuth, requireAdministrator, async (_request, response, next) => {
    try {
      const questions = await listAdministratorQuestions();
      response.json({ questions: questions.map(({ _count, ...question }) => ({ ...question, predictionCount: _count.predictions })) });
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/v1/private/admin/users/:userId/role", requireAuth, requireAdministrator, async (request: AuthenticatedRequest, response, next) => {
    const parsed = roleChangeRequestSchema.safeParse(request.body);
    if (!parsed.success || !request.auth) {
      response.status(400).json({ error: { code: "INVALID_INPUT", message: "Role and reason are invalid." } });
      return;
    }
    try {
      const user = await changeUserRole(String(request.params.userId), parsed.data.role, parsed.data.reason, request.auth.userId);
      response.json({ user: publicUser(user) });
    } catch (error) {
      if (error instanceof AdministratorActionError) {
        const status = error.code === "NOT_FOUND" ? 404 : 409;
        response.status(status).json({ error: { code: error.code, message: error.message } });
        return;
      }
      next(error);
    }
  });

  app.post("/api/v1/private/admin/questions/:questionId/cancel", requireAuth, requireAdministrator, async (request: AuthenticatedRequest, response, next) => {
    const parsed = questionCancellationRequestSchema.safeParse(request.body);
    if (!parsed.success || !request.auth) {
      response.status(400).json({ error: { code: "INVALID_INPUT", message: "A cancellation reason is required." } });
      return;
    }
    try {
      const result = await cancelQuestion(String(request.params.questionId), parsed.data.reason, request.auth.userId);
      response.json({ status: "CANCELLED", ...result });
    } catch (error) {
      if (error instanceof AdministratorActionError) {
        const status = error.code === "NOT_FOUND" ? 404 : 409;
        response.status(status).json({ error: { code: error.code, message: error.message } });
        return;
      }
      next(error);
    }
  });

  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

  const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
    console.error(error);
    response.status(500).json({ error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." } });
  };
  app.use(errorHandler);

  return app;
};
