// The one catalogue of error codes (ARCHITECTURE §5.4, EVAL_GUARDRAILS §5).

export const HTTP_ERRORS = {
  VALIDATION: { status: 400, message: "Check the highlighted fields." },
  PASSCODE_INVALID: { status: 401, message: "That passcode didn't work." },
  ADMIN_TOKEN_INVALID: { status: 401, message: "Invalid token." },
  FORBIDDEN: { status: 403, message: "This action isn't allowed from here." },
  BUDGET_EXHAUSTED: {
    status: 402,
    message: "Live runs are paused for today — explore the published investigations.",
  },
  NOT_FOUND: { status: 404, message: "We couldn't find that." },
  BRAND_NOT_FOUND: { status: 404, message: "We couldn't find that." },
  CONCURRENCY_LIMIT: {
    status: 409,
    message: "Two investigations are running. Try again in a few minutes.",
  },
  NOT_CANCELLABLE: { status: 409, message: "This investigation has already finished." },
  NOT_COMPLETED: { status: 409, message: "Only completed investigations can be published." },
  OUTCOME_EXISTS: { status: 409, message: "This demand test already has an outcome." },
  NOT_ELIGIBLE: { status: 409, message: "Only strong or emerging needs can be handed off." },
  RATE_LIMITED: { status: 429, message: "You've hit today's limit of live runs." },
  LIVE_RUNS_DISABLED: {
    status: 503,
    message: "Live runs are switched off here — explore the published investigations.",
  },
  STATS_UNAVAILABLE: { status: 503, message: "Stats unavailable" },
  INTERNAL: { status: 500, message: "Something broke on our side. It's been logged." },
} as const satisfies Record<string, { status: number; message: string }>;

export type HttpErrorCode = keyof typeof HTTP_ERRORS;

/** Stored on `investigation.error_code` and shown in the failed banner. */
export const RUN_ERROR_CODES = [
  "MODEL_UNAVAILABLE",
  "TOOL_LOOP_LIMIT",
  "TIMEOUT",
  "WORKER_LOST",
  "NO_SIGNALS_BEFORE_AS_OF",
  "INTERNAL",
] as const;
export type RunErrorCode = (typeof RUN_ERROR_CODES)[number];

/** Returned to the agent as tool results; never HTTP. */
export const TOOL_ERROR_CODES = [
  "CLAIM_NEEDS_EVIDENCE",
  "NUMBER_NOT_IN_SNAPSHOT",
  "EVIDENCE_AFTER_AS_OF",
  "EVIDENCE_NOT_FOUND",
  "SCEPTIC_PASS_REQUIRED",
  "NEED_NOT_ELIGIBLE",
  "NEED_NOT_FOUND",
  "DUPLICATE_FINDING",
  "INVALID_ARGUMENTS",
] as const;
export type ToolErrorCode = (typeof TOOL_ERROR_CODES)[number];

/** Pipeline failure codes stored on `video.ingest_error`. */
export const INGEST_ERROR_CODES = [
  "MEDIA_NOT_FOUND",
  "TRANSCRIBE_FAILED",
  "FRAMES_FAILED",
  "DESCRIBE_INVALID",
  "INTERNAL",
] as const;
export type IngestErrorCode = (typeof INGEST_ERROR_CODES)[number];

export class AppError extends Error {
  readonly code: HttpErrorCode;
  readonly status: number;
  readonly details: Record<string, unknown>;

  constructor(code: HttpErrorCode, message?: string, details: Record<string, unknown> = {}) {
    super(message ?? HTTP_ERRORS[code].message);
    this.name = "AppError";
    this.code = code;
    this.status = HTTP_ERRORS[code].status;
    this.details = details;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
