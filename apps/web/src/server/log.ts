// Structured JSON lines to stdout, which Vercel collects. Never pass transcripts, comments,
// prompts or secrets here (INSTRUCTIONS §8).

type Level = "info" | "warn" | "error";

function write(level: Level, msg: string, fields: Record<string, unknown>) {
  const line = JSON.stringify({ level, time: new Date().toISOString(), msg, ...fields });
  (level === "error" ? process.stderr : process.stdout).write(`${line}\n`);
}

export function errorFields(error: unknown): Record<string, unknown> {
  return error instanceof Error
    ? { error: { name: error.name, message: error.message, stack: error.stack } }
    : { error: String(error) };
}

export const log = {
  info: (msg: string, fields: Record<string, unknown> = {}) => write("info", msg, fields),
  warn: (msg: string, fields: Record<string, unknown> = {}) => write("warn", msg, fields),
  error: (msg: string, fields: Record<string, unknown> = {}) => write("error", msg, fields),
};
