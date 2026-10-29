import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import swaggerUi from "swagger-ui-express";
import { healthResponseSchema } from "@forecasthub/shared";
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
  app.use(cors({ origin: env.WEB_ORIGIN }));
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

  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

  const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
    console.error(error);
    response.status(500).json({ error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." } });
  };
  app.use(errorHandler);

  return app;
};
