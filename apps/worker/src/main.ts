import { createServer } from "node:http";
import * as Sentry from "@sentry/node";
import { SENTRY_DATA_COLLECTION } from "@unmet/shared";
import { loadLocalEnv } from "@unmet/shared/node";
import pino from "pino";
import { loadWorkerEnv } from "./env.ts";

loadLocalEnv();
const env = loadWorkerEnv();
const log = pino({ base: { workerId: env.WORKER_ID } });

// Errors only, tagged with the run; LLM payloads are never attached (ARCHITECTURE §14).
if (env.SENTRY_DSN) {
  Sentry.init({ dsn: env.SENTRY_DSN, tracesSampleRate: 0, dataCollection: SENTRY_DATA_COLLECTION });
  Sentry.setTag("workerId", env.WORKER_ID);
}

const server = createServer((req, res) => {
  if (req.url === "/healthz") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, workerId: env.WORKER_ID }));
    return;
  }
  res.writeHead(404).end();
});

server.listen(env.HEALTH_PORT, () => {
  // Queue claiming, heartbeats and the reaper attach here in P3 (ROADMAP P3.T9).
  log.info({ port: env.HEALTH_PORT }, "worker ready");
});

const shutdown = (signal: string) => {
  log.info({ signal }, "worker stopping");
  server.close(() => process.exit(0));
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
