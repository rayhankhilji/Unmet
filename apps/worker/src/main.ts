import { createServer } from "node:http";
import { loadLocalEnv } from "@unmet/shared/node";
import pino from "pino";
import { loadWorkerEnv } from "./env.ts";

loadLocalEnv();
const env = loadWorkerEnv();
const log = pino({ base: { workerId: env.WORKER_ID } });

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
