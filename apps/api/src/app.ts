import { createHash } from "node:crypto";
import cors from "cors";
import express, { type ErrorRequestHandler, type RequestHandler } from "express";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import { abQuestionRequestSchema, arenaFiltersSchema, categoryCreateRequestSchema, healthResponseSchema, loginRequestSchema, questionCancellationRequestSchema, registerRequestSchema, roleChangeRequestSchema } from "@forecasthub/shared";
import { authenticateUser, clearAuthCookie, createAccessToken, publicUser, registerUser, requireAdministrator, requireAuth, requireOrganizer, setAuthCookie, type AuthenticatedRequest } from "./auth.js";
import { AdministratorActionError, cancelQuestion, changeUserRole, listAdministratorHistory, listAdministratorQuestions, listAdministratorUsers } from "./administrator.js";
import { OrganizerActionError, createCategory, createOrganizerQuestion, finalizeOrganizerQuestion, listCategories, listOrganizerQuestions, publishOrganizerQuestion, updateOrganizerQuestion } from "./organizer.js";
import { env } from "./env.js";
import { prisma } from "./prisma.js";
import { placePrediction, previewPrediction } from "./predictions.js";
import { getMyPredictionHistory, getMyQuestionPredictions, getPublicQuestionDetail, listPublicArenaQuestions } from "./question-detail.js";
import { listReadyToResolve, resolveAbQuestion, ResolutionError } from "./resolution.js";
import { resolveAbQuestionRequestSchema } from "@forecasthub/shared";
import { getPublicLeaderboard } from "./leaderboard.js";
import { openApiDocument } from "./openapi.js";

export const createApp = () => {
  const app = express();
  const predictionRateLimitKey = (request: AuthenticatedRequest) => {
    if (!request.auth) {
      throw new Error("Prediction rate limiting requires authentication.");
    }
    return request.auth.userId;
  };
  const authRateLimitHandler: RequestHandler = (_request, response) => {
    response.status(429).json({ error: { code: "RATE_LIMITED", message: "Too many authentication attempts. Try again later." } });
  };
  const registrationRateLimit = rateLimit({
    handler: authRateLimitHandler,
    legacyHeaders: false,
    max: 10,
    standardHeaders: true,
    windowMs: 15 * 60 * 1000,
  });
  const loginIpRateLimit = rateLimit({
    handler: authRateLimitHandler,
    legacyHeaders: false,
    max: 300,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    windowMs: 15 * 60 * 1000,
  });
  const loginIdentifierRateLimit = rateLimit({
    handler: authRateLimitHandler,
    keyGenerator: (request) => createHash("sha256").update(loginRequestSchema.parse(request.body).identifier).digest("hex"),
    legacyHeaders: false,
    max: 10,
    skip: (request) => !loginRequestSchema.safeParse(request.body).success,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    windowMs: 15 * 60 * 1000,
  });
  const authSessionRateLimit = rateLimit({
    handler: (_request, response) => {
      response.status(429).json({ error: { code: "RATE_LIMITED", message: "Too many authentication requests. Try again later." } });
    },
    legacyHeaders: false,
    max: 600,
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
  const organizerReadyQuestionsRateLimit = rateLimit({
    handler: (_request, response) => {
      response.status(429).json({ error: { code: "RATE_LIMITED", message: "Too many organizer question requests. Try again later." } });
    },
    keyGenerator: predictionRateLimitKey,
    legacyHeaders: false,
    max: 60,
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

  app.get("/api/v1/public/categories", async (_request, response, next) => {
    try {
      response.json({ categories: await listCategories() });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/private/organizer/categories", authSessionRateLimit, requireAuth, requireOrganizer, async (request: AuthenticatedRequest, response, next) => {
    const parsed = categoryCreateRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: { code: "INVALID_INPUT", message: "Category name is invalid." } });
      return;
    }
    try {
      response.status(201).json({ category: await createCategory(parsed.data.name) });
    } catch (error) {
      if (error instanceof OrganizerActionError) {
        response.status(error.code === "DUPLICATE_CATEGORY" ? 409 : 400).json({ error: { code: error.code, message: error.message } });
        return;
      }
      next(error);
    }
  });

  app.post("/api/v1/auth/register", registrationRateLimit, async (request, response, next) => {
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

  app.post("/api/v1/auth/login", loginIpRateLimit, loginIdentifierRateLimit, async (request, response, next) => {
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

  app.get("/api/v1/private/predictions", authSessionRateLimit, requireAuth, async (request: AuthenticatedRequest, response, next) => {
    try {
      await getMyPredictionHistory(request, response);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/private/organizer/questions", authSessionRateLimit, requireAuth, requireOrganizer, async (request: AuthenticatedRequest, response, next) => {
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

  app.post("/api/v1/private/organizer/questions/:questionId/resolve", authSessionRateLimit, requireAuth, requireOrganizer, async (request: AuthenticatedRequest, response, next) => {
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

  app.post("/api/v1/private/organizer/questions", authSessionRateLimit, requireAuth, requireOrganizer, async (request: AuthenticatedRequest, response, next) => {
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

  app.patch("/api/v1/private/organizer/questions/:questionId", authSessionRateLimit, requireAuth, requireOrganizer, async (request: AuthenticatedRequest, response, next) => {
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

  app.post("/api/v1/private/organizer/questions/:questionId/publish", authSessionRateLimit, requireAuth, requireOrganizer, async (request: AuthenticatedRequest, response, next) => {
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

  app.post("/api/v1/private/organizer/questions/:questionId/finalize", authSessionRateLimit, requireAuth, requireOrganizer, async (request: AuthenticatedRequest, response, next) => {
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

  app.get("/api/v1/private/admin/users", authSessionRateLimit, requireAuth, requireAdministrator, async (_request, response, next) => {
    try {
      const page = Number(_request.query.page) || 1;
      const search = typeof _request.query.search === "string" ? _request.query.search.trim().slice(0, 100) : "";
      response.json(await listAdministratorUsers(page, search));
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/private/admin/questions", authSessionRateLimit, requireAuth, requireAdministrator, async (_request, response, next) => {
    try {
      const page = Number(_request.query.page) || 1;
      const search = typeof _request.query.search === "string" ? _request.query.search.trim().slice(0, 100) : "";
      response.json(await listAdministratorQuestions(page, search));
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/private/admin/history", authSessionRateLimit, requireAuth, requireAdministrator, async (request, response, next) => {
    try {
      const page = Number(request.query.page) || 1;
      response.json(await listAdministratorHistory(page));
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/v1/private/admin/users/:userId/role", authSessionRateLimit, requireAuth, requireAdministrator, async (request: AuthenticatedRequest, response, next) => {
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

  app.post("/api/v1/private/admin/questions/:questionId/cancel", authSessionRateLimit, requireAuth, requireAdministrator, async (request: AuthenticatedRequest, response, next) => {
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
