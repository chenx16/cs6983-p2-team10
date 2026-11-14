import { createApp } from "./app.js";
import { env } from "./env.js";
import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { publicQuestionCanStream, subscribeToQuestion } from "./live-updates.js";

const app = createApp();
const server = createServer(app);
const websocketServer = new WebSocketServer({ noServer: true });

server.on("upgrade", (request, socket, head) => {
  const match = request.url?.match(/^\/api\/v1\/public\/questions\/([^/]+)\/stream$/);
  if (!match) {
    socket.destroy();
    return;
  }
  const questionId = decodeURIComponent(match[1]!);
  void publicQuestionCanStream(questionId).then((canStream) => {
    if (!canStream) {
      socket.destroy();
      return;
    }
    websocketServer.handleUpgrade(request, socket, head, (websocket) => {
      subscribeToQuestion(questionId, websocket);
    });
  }).catch(() => socket.destroy());
});

server.listen(env.API_PORT, () => {
  console.log(`ForecastHub API listening on http://localhost:${env.API_PORT}`);
});
