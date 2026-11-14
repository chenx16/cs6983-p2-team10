import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import { abQuestionRequestSchema, arenaFiltersSchema, healthResponseSchema, loginRequestSchema, questionCancellationRequestSchema, registerRequestSchema, roleChangeRequestSchema } from "@forecasthub/shared";
import { authenticateUser, clearAuthCookie, createAccessToken, publicUser, registerUser, requireAdministrator, requireAuth, requireOrganizer, setAuthCookie, type AuthenticatedRequest } from "./auth.js";
import { AdministratorActionError, cancelQuestion, changeUserRole, listAdministratorHistory, listAdministratorQuestions, listAdministratorUsers } from "./administrator.js";
import { OrganizerActionError, createOrganizerQuestion, finalizeOrganizerQuestion, listCategories, listOrganizerQuestions, publishOrganizerQuestion, updateOrganizerQuestion } from "./organizer.js";
import { env } from "./env.js";
import { prisma } from "./prisma.js";
import { placePrediction, previewPrediction } from "./predictions.js";
import { getMyPredictionHistory, getMyQuestionPredictions, getPublicQuestionDetail, listPublicArenaQuestions } from "./question-detail.js";
import { listReadyToResolve, resolveAbQuestion, ResolutionError } from "./resolution.js";
import { resolveAbQuestionRequestSchema } from "@forecasthub/shared";
import { getPublicLeaderboard } from "./leaderboard.js";

export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "ForecastHub API",
    version: "0.1.0",
    description: "Versioned A/B prediction API. Public responses contain aggregates only; private routes require the access_token cookie.",
  },
  servers: [{ url: "/" }],
  paths: {
    "/health": { get: { summary: "Check process health", responses: { "200": { description: "Healthy", content: { "application/json": { schema: { $ref: "#/components/schemas/HealthResponse" } } } } } } },
    "/api/v1/public/health": { get: { summary: "Check public API health", responses: { "200": { description: "Healthy", content: { "application/json": { schema: { $ref: "#/components/schemas/HealthResponse" } } } } } } },
    "/api/v1/public/questions": {
      get: {
        summary: "List public A/B questions",
        parameters: [
          { name: "category", in: "query", description: "Repeat for multiple category IDs.", schema: { type: "array", items: { type: "string" } }, style: "form", explode: true },
          { name: "status", in: "query", schema: { type: "string", enum: ["OPEN", "CLOSING_SOON", "CLOSED", "RESOLVED", "CANCELLED"], default: "OPEN" } },
          { name: "type", in: "query", schema: { type: "string", enum: ["AB", "MULTI_ANSWER"], default: "AB" } },
        ],
        responses: { "200": { description: "Aggregate question data." }, "400": { $ref: "#/components/responses/InvalidInput" }, "429": { $ref: "#/components/responses/RateLimited" } },
      },
    },
    "/api/v1/public/questions/{questionId}": {
      get: {
        summary: "Get public A/B question details",
        parameters: [{ $ref: "#/components/parameters/QuestionId" }],
        responses: { "200": { description: "Question details and aggregate prices." }, "404": { $ref: "#/components/responses/NotFound" }, "429": { $ref: "#/components/responses/RateLimited" } },
      },
    },
    "/api/v1/public/questions/{questionId}/stream": {
      get: {
        summary: "WebSocket stream for public A/B price updates",
        description: "Upgrade this path to WebSocket. Messages include only aggregate prices and credits.",
        parameters: [{ $ref: "#/components/parameters/QuestionId" }],
        responses: { "101": { description: "WebSocket connection established." }, "404": { $ref: "#/components/responses/NotFound" } },
      },
    },
    "/api/v1/public/categories": { get: { summary: "List question categories", responses: { "200": { description: "Category IDs and names." }, "429": { $ref: "#/components/responses/RateLimited" } } } },
    "/api/v1/public/leaderboard": { get: { summary: "Get the public leaderboard", description: "Returns rank, username, scored questions, and success rate only.", responses: { "200": { description: "Leaderboard entries." }, "429": { $ref: "#/components/responses/RateLimited" } } } },
    "/api/v1/auth/register": {
      post: {
        summary: "Register an account",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RegisterRequest" }, example: { username: "forecaster", email: "user@example.com", password: "CorrectHorse1" } } } },
        responses: { "201": { description: "Account created." }, "400": { $ref: "#/components/responses/InvalidInput" }, "409": { description: "Duplicate account." }, "429": { $ref: "#/components/responses/RateLimited" } },
      },
    },
    "/api/v1/auth/login": {
      post: {
        summary: "Sign in",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/LoginRequest" }, example: { identifier: "forecaster", password: "CorrectHorse1" } } } },
        responses: { "200": { description: "Signed-in user and access cookie." }, "400": { $ref: "#/components/responses/InvalidInput" }, "401": { $ref: "#/components/responses/Unauthenticated" }, "429": { $ref: "#/components/responses/RateLimited" } },
      },
    },
    "/api/v1/auth/logout": { post: { summary: "Sign out", responses: { "204": { description: "Cookie cleared." }, "429": { $ref: "#/components/responses/RateLimited" } } } },
    "/api/v1/private/me": { get: { summary: "Get the current user", security: [{ cookieAuth: [] }], responses: { "200": { description: "Private user profile." }, "401": { $ref: "#/components/responses/Unauthenticated" }, "429": { $ref: "#/components/responses/RateLimited" } } } },
    "/api/v1/private/predictions": { get: { summary: "Get the current user's prediction history", security: [{ cookieAuth: [] }], responses: { "200": { description: "Private prediction history." }, "401": { $ref: "#/components/responses/Unauthenticated" }, "429": { $ref: "#/components/responses/RateLimited" } } } },
    "/api/v1/private/questions/{questionId}/predictions": {
      get: { summary: "Get the current user's predictions for a question", security: [{ cookieAuth: [] }], parameters: [{ $ref: "#/components/parameters/QuestionId" }], responses: { "200": { description: "Private predictions." }, "401": { $ref: "#/components/responses/Unauthenticated" }, "404": { $ref: "#/components/responses/NotFound" }, "429": { $ref: "#/components/responses/RateLimited" } } },
      post: { summary: "Place a prediction", security: [{ cookieAuth: [] }], parameters: [{ $ref: "#/components/parameters/QuestionId" }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/PlacePredictionRequest" }, example: { answerId: "answer-id", budget: 100, minShares: 190, idempotencyKey: "request-123" } } } }, responses: { "201": { description: "Prediction created." }, "400": { $ref: "#/components/responses/InvalidInput" }, "401": { $ref: "#/components/responses/Unauthenticated" }, "409": { description: "Price changed or request was already processed." }, "429": { $ref: "#/components/responses/RateLimited" } } },
    },
    "/api/v1/private/questions/{questionId}/predictions/preview": { post: { summary: "Preview a prediction", security: [{ cookieAuth: [] }], parameters: [{ $ref: "#/components/parameters/QuestionId" }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/PredictionPreviewRequest" }, example: { answerId: "answer-id", budget: 100 } } } }, responses: { "200": { description: "Server-calculated prediction preview." }, "400": { $ref: "#/components/responses/InvalidInput" }, "401": { $ref: "#/components/responses/Unauthenticated" }, "429": { $ref: "#/components/responses/RateLimited" } } } },
    "/api/v1/private/organizer/questions": {
      get: { summary: "List the organizer's questions", security: [{ cookieAuth: [] }], responses: { "200": { description: "Owned questions." }, "401": { $ref: "#/components/responses/Unauthenticated" }, "403": { $ref: "#/components/responses/Forbidden" }, "429": { $ref: "#/components/responses/RateLimited" } } },
      post: { summary: "Create an A/B question draft", security: [{ cookieAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AbQuestionRequest" } } } }, responses: { "201": { description: "Draft created." }, "400": { $ref: "#/components/responses/InvalidInput" }, "401": { $ref: "#/components/responses/Unauthenticated" }, "403": { $ref: "#/components/responses/Forbidden" }, "429": { $ref: "#/components/responses/RateLimited" } } },
    },
    "/api/v1/private/organizer/questions/{questionId}": { patch: { summary: "Update an owned draft", security: [{ cookieAuth: [] }], parameters: [{ $ref: "#/components/parameters/QuestionId" }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AbQuestionRequest" } } } }, responses: { "200": { description: "Updated question." }, "400": { $ref: "#/components/responses/InvalidInput" }, "401": { $ref: "#/components/responses/Unauthenticated" }, "403": { $ref: "#/components/responses/Forbidden" }, "404": { $ref: "#/components/responses/NotFound" }, "429": { $ref: "#/components/responses/RateLimited" } } } },
    "/api/v1/private/organizer/questions/{questionId}/publish": { post: { summary: "Publish an owned draft", security: [{ cookieAuth: [] }], parameters: [{ $ref: "#/components/parameters/QuestionId" }], responses: { "200": { description: "Published question." }, "401": { $ref: "#/components/responses/Unauthenticated" }, "403": { $ref: "#/components/responses/Forbidden" }, "404": { $ref: "#/components/responses/NotFound" }, "409": { description: "Invalid question state." }, "429": { $ref: "#/components/responses/RateLimited" } } } },
    "/api/v1/private/organizer/questions/{questionId}/finalize": { post: { summary: "Close an owned question", security: [{ cookieAuth: [] }], parameters: [{ $ref: "#/components/parameters/QuestionId" }], responses: { "200": { description: "Closed question." }, "401": { $ref: "#/components/responses/Unauthenticated" }, "403": { $ref: "#/components/responses/Forbidden" }, "404": { $ref: "#/components/responses/NotFound" }, "409": { description: "Invalid question state." }, "429": { $ref: "#/components/responses/RateLimited" } } } },
    "/api/v1/private/organizer/questions/ready-to-resolve": { get: { summary: "List questions ready to resolve", security: [{ cookieAuth: [] }], responses: { "200": { description: "Eligible questions." }, "401": { $ref: "#/components/responses/Unauthenticated" }, "403": { $ref: "#/components/responses/Forbidden" }, "429": { $ref: "#/components/responses/RateLimited" } } } },
    "/api/v1/private/organizer/questions/{questionId}/resolve": { post: { summary: "Resolve an A/B question and settle predictions", security: [{ cookieAuth: [] }], parameters: [{ $ref: "#/components/parameters/QuestionId" }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ResolveRequest" }, example: { answerId: "answer-id", evidenceNote: "Verified source evidence." } } } }, responses: { "200": { description: "Resolved question." }, "400": { $ref: "#/components/responses/InvalidInput" }, "401": { $ref: "#/components/responses/Unauthenticated" }, "403": { $ref: "#/components/responses/Forbidden" }, "409": { description: "Question cannot be resolved." }, "429": { $ref: "#/components/responses/RateLimited" } } } },
    "/api/v1/private/admin/users": { get: { summary: "List users", security: [{ cookieAuth: [] }], parameters: [{ $ref: "#/components/parameters/Page" }, { $ref: "#/components/parameters/Search" }], responses: { "200": { description: "Paginated users." }, "401": { $ref: "#/components/responses/Unauthenticated" }, "403": { $ref: "#/components/responses/Forbidden" }, "429": { $ref: "#/components/responses/RateLimited" } } } },
    "/api/v1/private/admin/questions": { get: { summary: "List questions for administration", security: [{ cookieAuth: [] }], parameters: [{ $ref: "#/components/parameters/Page" }, { $ref: "#/components/parameters/Search" }], responses: { "200": { description: "Paginated questions." }, "401": { $ref: "#/components/responses/Unauthenticated" }, "403": { $ref: "#/components/responses/Forbidden" }, "429": { $ref: "#/components/responses/RateLimited" } } } },
    "/api/v1/private/admin/history": { get: { summary: "List administrative audit history", security: [{ cookieAuth: [] }], parameters: [{ $ref: "#/components/parameters/Page" }], responses: { "200": { description: "Paginated audit history." }, "401": { $ref: "#/components/responses/Unauthenticated" }, "403": { $ref: "#/components/responses/Forbidden" }, "429": { $ref: "#/components/responses/RateLimited" } } } },
    "/api/v1/private/admin/users/{userId}/role": { patch: { summary: "Change a user's role", security: [{ cookieAuth: [] }], parameters: [{ $ref: "#/components/parameters/UserId" }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RoleChangeRequest" } } } }, responses: { "200": { description: "Updated user." }, "400": { $ref: "#/components/responses/InvalidInput" }, "401": { $ref: "#/components/responses/Unauthenticated" }, "403": { $ref: "#/components/responses/Forbidden" }, "404": { $ref: "#/components/responses/NotFound" }, "409": { description: "Role change rejected." }, "429": { $ref: "#/components/responses/RateLimited" } } } },
    "/api/v1/private/admin/questions/{questionId}/cancel": { post: { summary: "Cancel a question and refund predictions", security: [{ cookieAuth: [] }], parameters: [{ $ref: "#/components/parameters/QuestionId" }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CancellationRequest" } } } }, responses: { "200": { description: "Cancelled question and refund result." }, "400": { $ref: "#/components/responses/InvalidInput" }, "401": { $ref: "#/components/responses/Unauthenticated" }, "403": { $ref: "#/components/responses/Forbidden" }, "404": { $ref: "#/components/responses/NotFound" }, "409": { description: "Cancellation rejected." }, "429": { $ref: "#/components/responses/RateLimited" } } } },
  },
  components: {
    securitySchemes: { cookieAuth: { type: "apiKey", in: "cookie", name: "access_token" } },
    parameters: {
      QuestionId: { name: "questionId", in: "path", required: true, schema: { type: "string" } },
      UserId: { name: "userId", in: "path", required: true, schema: { type: "string" } },
      Page: { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
      Search: { name: "search", in: "query", schema: { type: "string", maxLength: 100 } },
    },
    responses: {
      InvalidInput: { description: "Invalid request.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" }, example: { error: { code: "INVALID_INPUT", message: "Invalid request." } } } } },
      Unauthenticated: { description: "Authentication is required or the token is invalid." },
      Forbidden: { description: "The authenticated user lacks the required role." },
      NotFound: { description: "Resource not found." },
      RateLimited: { description: "Rate limit exceeded. Retry after the response's Retry-After header or retryAfterSeconds value." },
    },
    schemas: {
      ErrorResponse: { type: "object", required: ["error"], properties: { error: { type: "object", required: ["code", "message"], properties: { code: { type: "string" }, message: { type: "string" } } } }, retryAfterSeconds: { type: "integer", description: "Seconds before retrying a rate-limited request." } },
      HealthResponse: { type: "object", properties: { status: { type: "string", enum: ["ok"] }, service: { type: "string" }, timestamp: { type: "string", format: "date-time" } } },
      RegisterRequest: { type: "object", required: ["username", "email", "password"], properties: { username: { type: "string" }, email: { type: "string", format: "email" }, password: { type: "string", format: "password" } } },
      LoginRequest: { type: "object", required: ["identifier", "password"], properties: { identifier: { type: "string" }, password: { type: "string", format: "password" } } },
      AbQuestionRequest: { type: "object", required: ["title", "categoryId", "answerA", "answerB", "deadline", "eventTime", "outcomeCriteria", "source"], properties: { title: { type: "string" }, categoryId: { type: "string" }, answerA: { type: "string" }, answerB: { type: "string" }, startingPriceA: { type: "integer", minimum: 10, maximum: 90 }, deadline: { type: "string", format: "date-time" }, eventTime: { type: "string", format: "date-time" }, outcomeCriteria: { type: "string" }, source: { type: "string" } } },
      PredictionPreviewRequest: { type: "object", required: ["answerId", "budget"], properties: { answerId: { type: "string" }, budget: { type: "integer", minimum: 10 } } },
      PlacePredictionRequest: { type: "object", required: ["answerId", "budget", "minShares", "idempotencyKey"], properties: { answerId: { type: "string" }, budget: { type: "integer", minimum: 10 }, minShares: { type: "integer", minimum: 0 }, idempotencyKey: { type: "string" } } },
      ResolveRequest: { type: "object", required: ["answerId", "evidenceNote"], properties: { answerId: { type: "string" }, evidenceNote: { type: "string" } } },
      RoleChangeRequest: { type: "object", required: ["role", "reason"], properties: { role: { type: "string", enum: ["USER", "ORGANIZER", "ADMINISTRATOR"] }, reason: { type: "string" } } },
      CancellationRequest: { type: "object", required: ["reason"], properties: { reason: { type: "string" } } },
    },
  },
};

export const createApp = () => {
  const app = express();
  const rateLimitHandler = (message: string) => (_request: unknown, response: express.Response) => {
    response.setHeader("Retry-After", "60");
    response.status(429).json({
      error: { code: "RATE_LIMITED", message },
      retryAfterSeconds: 60,
    });
  };
  const predictionRateLimitKey = (request: AuthenticatedRequest) => {
    if (!request.auth) {
      throw new Error("Prediction rate limiting requires authentication.");
    }
    return request.auth.userId;
  };
  const authMutationRateLimit = rateLimit({
    handler: rateLimitHandler("Too many authentication attempts. Try again later."),
    legacyHeaders: false,
    max: 10,
    standardHeaders: true,
    windowMs: 15 * 60 * 1000,
  });
  const authSessionRateLimit = rateLimit({
    handler: rateLimitHandler("Too many authentication requests. Try again later."),
    legacyHeaders: false,
    max: 100,
    standardHeaders: true,
    windowMs: 15 * 60 * 1000,
  });
  const predictionPreAuthRateLimit = rateLimit({
    handler: rateLimitHandler("Too many prediction requests. Try again later."),
    legacyHeaders: false,
    max: env.PREDICTION_PREAUTH_RATE_LIMIT,
    standardHeaders: true,
    windowMs: 60 * 1000,
  });
  const publicQuestionDetailRateLimit = rateLimit({
    handler: rateLimitHandler("Too many public API requests. Try again later."),
    legacyHeaders: false,
    max: env.PUBLIC_QUESTION_DETAIL_RATE_LIMIT,
    standardHeaders: true,
    windowMs: 60 * 1000,
  });
  const predictionPreviewRateLimit = rateLimit({
    handler: rateLimitHandler("Too many preview requests. Try again later."),
    keyGenerator: predictionRateLimitKey,
    legacyHeaders: false,
    max: 120,
    standardHeaders: true,
    windowMs: 60 * 1000,
  });
  const predictionPlacementRateLimit = rateLimit({
    handler: rateLimitHandler("Too many prediction requests. Try again later."),
    keyGenerator: predictionRateLimitKey,
    legacyHeaders: false,
    max: 120,
    standardHeaders: true,
    windowMs: 60 * 1000,
  });
  const myQuestionPredictionsRateLimit = rateLimit({
    handler: rateLimitHandler("Too many prediction history requests. Try again later."),
    keyGenerator: predictionRateLimitKey,
    legacyHeaders: false,
    max: 120,
    standardHeaders: true,
    windowMs: 60 * 1000,
  });
  const organizerReadyQuestionsRateLimit = rateLimit({
    handler: rateLimitHandler("Too many organizer question requests. Try again later."),
    keyGenerator: predictionRateLimitKey,
    legacyHeaders: false,
    max: 60,
    standardHeaders: true,
    windowMs: 60 * 1000,
  });
  const privateApiRateLimit = rateLimit({
    handler: rateLimitHandler("Too many private API requests. Try again later."),
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

  app.get("/api/v1/public/health", publicQuestionDetailRateLimit, (_request, response) => {
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

  app.get("/api/v1/public/leaderboard", publicQuestionDetailRateLimit, async (_request, response, next) => {
    try {
      response.json(await getPublicLeaderboard());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/public/questions", publicQuestionDetailRateLimit, async (request, response, next) => {
    const filters = arenaFiltersSchema.safeParse(request.query);
    if (!filters.success) {
      response.status(400).json({ error: { code: "INVALID_INPUT", message: "Invalid question filters." } });
      return;
    }
    try {
      response.json({ questions: await listPublicArenaQuestions(filters.data) });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/public/categories", publicQuestionDetailRateLimit, async (_request, response, next) => {
    try {
      response.json({ categories: await listCategories() });
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

  app.get("/api/v1/private/me", requireAuth, privateApiRateLimit, async (request: AuthenticatedRequest, response, next) => {
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

  app.get("/api/v1/private/predictions", requireAuth, privateApiRateLimit, async (request: AuthenticatedRequest, response, next) => {
    try {
      await getMyPredictionHistory(request, response);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/private/organizer/questions", requireAuth, privateApiRateLimit, requireOrganizer, async (request: AuthenticatedRequest, response, next) => {
    try {
      response.json({ questions: await listOrganizerQuestions(request.auth!.userId) });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/private/organizer/questions/ready-to-resolve", requireAuth, organizerReadyQuestionsRateLimit, requireOrganizer, async (request: AuthenticatedRequest, response, next) => {
    try {
      response.json({ questions: await listReadyToResolve(request.auth!.userId) });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/private/organizer/questions/:questionId/resolve", requireAuth, privateApiRateLimit, requireOrganizer, async (request: AuthenticatedRequest, response, next) => {
    const parsed = resolveAbQuestionRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: { code: "INVALID_INPUT", message: parsed.error.issues.map((issue) => issue.message).join(" ") } });
      return;
    }
    try {
      const question = await resolveAbQuestion(request.auth!.userId, String(request.params.questionId), parsed.data);
      response.json({ question });
    } catch (error) {
      if (error instanceof ResolutionError) {
        response.status(error.code === "NOT_FOUND" ? 404 : 409).json({ error: { code: error.code, message: error.message } });
        return;
      }
      next(error);
    }
  });

  app.post("/api/v1/private/organizer/questions", requireAuth, privateApiRateLimit, requireOrganizer, async (request: AuthenticatedRequest, response, next) => {
    const parsed = abQuestionRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      const message = parsed.error.issues.map((issue) => issue.message).join(" ");
      response.status(400).json({ error: { code: "INVALID_INPUT", message } });
      return;
    }
    if (!request.auth) {
      response.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Authentication is required." } });
      return;
    }
    try {
      const question = await createOrganizerQuestion(request.auth.userId, parsed.data);
      response.status(201).json({ question });
    } catch (error) {
      if (error instanceof OrganizerActionError) {
        response.status(400).json({ error: { code: error.code, message: error.message } });
        return;
      }
      next(error);
    }
  });

  app.patch("/api/v1/private/organizer/questions/:questionId", requireAuth, privateApiRateLimit, requireOrganizer, async (request: AuthenticatedRequest, response, next) => {
    const parsed = abQuestionRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      const message = parsed.error.issues.map((issue) => issue.message).join(" ");
      response.status(400).json({ error: { code: "INVALID_INPUT", message } });
      return;
    }
    if (!request.auth) {
      response.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Authentication is required." } });
      return;
    }
    try {
      const question = await updateOrganizerQuestion(request.auth.userId, String(request.params.questionId), parsed.data);
      response.json({ question });
    } catch (error) {
      if (error instanceof OrganizerActionError) {
        response.status(error.code === "NOT_FOUND" ? 404 : 409).json({ error: { code: error.code, message: error.message } });
        return;
      }
      next(error);
    }
  });

  app.post("/api/v1/private/organizer/questions/:questionId/publish", requireAuth, privateApiRateLimit, requireOrganizer, async (request: AuthenticatedRequest, response, next) => {
    try {
      const question = await publishOrganizerQuestion(request.auth!.userId, String(request.params.questionId));
      response.json({ question });
    } catch (error) {
      if (error instanceof OrganizerActionError) {
        response.status(error.code === "NOT_FOUND" ? 404 : 409).json({ error: { code: error.code, message: error.message } });
        return;
      }
      next(error);
    }
  });

  app.post("/api/v1/private/organizer/questions/:questionId/finalize", requireAuth, privateApiRateLimit, requireOrganizer, async (request: AuthenticatedRequest, response, next) => {
    try {
      const question = await finalizeOrganizerQuestion(request.auth!.userId, String(request.params.questionId));
      response.json({ question });
    } catch (error) {
      if (error instanceof OrganizerActionError) {
        response.status(error.code === "NOT_FOUND" ? 404 : 409).json({ error: { code: error.code, message: error.message } });
        return;
      }
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

  app.get("/api/v1/private/admin/users", requireAuth, privateApiRateLimit, requireAdministrator, async (_request, response, next) => {
    try {
      const page = Number(_request.query.page) || 1;
      const search = typeof _request.query.search === "string" ? _request.query.search.trim().slice(0, 100) : "";
      response.json(await listAdministratorUsers(page, search));
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/private/admin/questions", requireAuth, privateApiRateLimit, requireAdministrator, async (_request, response, next) => {
    try {
      const page = Number(_request.query.page) || 1;
      const search = typeof _request.query.search === "string" ? _request.query.search.trim().slice(0, 100) : "";
      response.json(await listAdministratorQuestions(page, search));
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/private/admin/history", requireAuth, privateApiRateLimit, requireAdministrator, async (request, response, next) => {
    try {
      const page = Number(request.query.page) || 1;
      response.json(await listAdministratorHistory(page));
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/v1/private/admin/users/:userId/role", requireAuth, privateApiRateLimit, requireAdministrator, async (request: AuthenticatedRequest, response, next) => {
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

  app.post("/api/v1/private/admin/questions/:questionId/cancel", requireAuth, privateApiRateLimit, requireAdministrator, async (request: AuthenticatedRequest, response, next) => {
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
