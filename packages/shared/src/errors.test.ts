import { describe, expect, it } from "vitest";
import { AppError, HTTP_ERRORS, isAppError } from "./errors.ts";

describe("AppError", () => {
  it("takes status and default message from the catalogue", () => {
    const error = new AppError("BUDGET_EXHAUSTED");
    expect(error.status).toBe(402);
    expect(error.message).toBe(
      "Live runs are paused for today — explore the published investigations.",
    );
    expect(error.details).toEqual({});
    expect(isAppError(error)).toBe(true);
    expect(isAppError(new Error("x"))).toBe(false);
  });

  it("allows a specific message and details", () => {
    const error = new AppError("RATE_LIMITED", "Too many attempts.", { retryAfterSeconds: 60 });
    expect(error.message).toBe("Too many attempts.");
    expect(error.details).toEqual({ retryAfterSeconds: 60 });
  });

  it("maps every documented code to its HTTP status", () => {
    expect(HTTP_ERRORS.VALIDATION.status).toBe(400);
    expect(HTTP_ERRORS.PASSCODE_INVALID.status).toBe(401);
    expect(HTTP_ERRORS.ADMIN_TOKEN_INVALID.status).toBe(401);
    expect(HTTP_ERRORS.FORBIDDEN.status).toBe(403);
    expect(HTTP_ERRORS.NOT_FOUND.status).toBe(404);
    expect(HTTP_ERRORS.BRAND_NOT_FOUND.status).toBe(404);
    expect(HTTP_ERRORS.CONCURRENCY_LIMIT.status).toBe(409);
    expect(HTTP_ERRORS.RATE_LIMITED.status).toBe(429);
    expect(HTTP_ERRORS.STATS_UNAVAILABLE.status).toBe(503);
    expect(HTTP_ERRORS.INTERNAL.status).toBe(500);
  });
});
