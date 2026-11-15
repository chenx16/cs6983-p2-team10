import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer, connect } from "node:net";
import { fileURLToPath } from "node:url";
import { PrismaClient, QuestionStatus, QuestionType } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import WebSocket from "ws";
import { resetDatabase } from "./test/reset-db.js";

const prisma = new PrismaClient();

beforeEach(async () => resetDatabase(prisma));
afterAll(async () => prisma.$disconnect());

describe("WebSocket upgrades", () => {
  it("keeps serving after rejecting a malformed question ID", async () => {
    const organizer = await prisma.user.create({
      data: { username: "streamorganizer", email: "stream@example.com", passwordHash: "test" },
    });
    const category = await prisma.category.create({ data: { name: "Streaming" } });
    const question = await prisma.question.create({
      data: {
        id: "stream-é",
        title: "Can this question stream?",
        type: QuestionType.AB,
        status: QuestionStatus.OPEN,
        categoryId: category.id,
        organizerId: organizer.id,
        deadline: new Date("2030-01-01T00:00:00Z"),
        eventTime: new Date("2030-01-01T01:00:00Z"),
        outcomeCriteria: "Test criteria",
        source: "Test source",
        publishedAt: new Date(),
      },
    });
    const reservation = createServer();
    await new Promise<void>((resolve, reject) => {
      reservation.once("error", reject);
      reservation.listen(0, "127.0.0.1", resolve);
    });
    const address = reservation.address();
    if (!address || typeof address === "string") throw new Error("Expected an available port");
    const port = address.port;
    await new Promise<void>((resolve, reject) => reservation.close((error) => error ? reject(error) : resolve()));

    const server = spawn(process.execPath, ["--import", "tsx", fileURLToPath(new URL("./server.ts", import.meta.url))], {
      env: { ...process.env, API_PORT: String(port), JWT_SECRET: "server-test-secret-at-least-32-characters" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const exited = new Promise<number | null>((resolve) => server.once("exit", resolve));
    try {
      await Promise.race([
        new Promise<void>((resolve) => {
          server.stdout.on("data", (chunk: Buffer) => {
            if (chunk.toString().includes("ForecastHub API listening")) resolve();
          });
        }),
        exited.then((code) => { throw new Error(`API exited before listening: ${code}`); }),
      ]);

      const websocket = new WebSocket(`ws://127.0.0.1:${port}/api/v1/public/questions/${encodeURIComponent(question.id)}/stream`);
      await once(websocket, "open");
      websocket.close();
      await once(websocket, "close");

      const socket = connect(port, "127.0.0.1");
      socket.on("error", () => {});
      await once(socket, "connect");
      socket.write("GET /api/v1/public/questions/%E0%A4%A/stream HTTP/1.1\r\nHost: localhost\r\nConnection: Upgrade\r\nUpgrade: websocket\r\nSec-WebSocket-Version: 13\r\nSec-WebSocket-Key: MDEyMzQ1Njc4OWFiY2RlZg==\r\n\r\n");
      await new Promise<void>((resolve) => socket.once("close", resolve));

      const health = await fetch(`http://127.0.0.1:${port}/api/v1/public/health`);
      expect(health.status).toBe(200);
      expect(await health.json()).toMatchObject({ status: "ok" });
    } finally {
      if (server.exitCode === null && server.signalCode === null) server.kill("SIGTERM");
      await exited;
    }
  }, 20000);
});
