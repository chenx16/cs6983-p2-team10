import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import { healthResponseSchema, loginRequestSchema, registerRequestSchema } from "@forecasthub/shared";
import { authenticateUser, clearAuthCookie, createAccessToken, publicUser, registerUser, requireAuth, setAuthCookie, type AuthenticatedRequest } from "./auth.js";
import { env } from "./env.js";
import { prisma } from "./prisma.js";
import { placePrediction, previewPrediction } from "./predictions.js";

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
    },
  },
};

export const createApp = () => {
  const app = express();
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

  app.post("/api/v1/private/questions/:questionId/predictions/preview", requireAuth, async (request: AuthenticatedRequest, response, next) => {
    try {
      await previewPrediction(request, response);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/private/questions/:questionId/predictions", requireAuth, async (request: AuthenticatedRequest, response, next) => {
    try {
      await placePrediction(request, response);
    } catch (error) {
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
