import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { AppError } from "./errors.ts";
import {
  ErrorEnvelope,
  errorResponse,
  json,
  parseJsonBody,
  parseSearchParams,
  REQUEST_ID_HEADER,
  withErrorEnvelope,
} from "./http.ts";

const post = (body: string, headers: Record<string, string> = {}) =>
  new Request("http://localhost/api/v1/x", { method: "POST", body, headers });

async function envelope(res: Response) {
  return ErrorEnvelope.parse(await res.json());
}

describe("withErrorEnvelope", () => {
  it("passes successful responses through and stamps the request ID", async () => {
    const handler = withErrorEnvelope(async () => json({ ok: true }));
    const res = await handler(post("{}", { [REQUEST_ID_HEADER]: "req-1" }), {});
    expect(res.status).toBe(200);
    expect(res.headers.get(REQUEST_ID_HEADER)).toBe("req-1");
    expect(await res.json()).toEqual({ ok: true });
  });

  it("generates a request ID when the header is absent", async () => {
    const res = await withErrorEnvelope(async () => json({}))(post("{}"), {});
    expect(res.headers.get(REQUEST_ID_HEADER)).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("renders AppError as the documented envelope", async () => {
    const handler = withErrorEnvelope(async () => {
      throw new AppError("RATE_LIMITED", undefined, { retryAfterSeconds: 30 });
    });
    const res = await handler(post("{}"), {});
    expect(res.status).toBe(429);
    expect(await envelope(res)).toEqual({
      error: {
        code: "RATE_LIMITED",
        message: "You've hit today's limit of live runs.",
        details: { retryAfterSeconds: 30 },
      },
    });
  });

  it("renders thrown Zod errors as VALIDATION with field errors", async () => {
    const handler = withErrorEnvelope(async () => {
      z.object({ question: z.string().min(10) }).parse({ question: "short" });
      return json({});
    });
    const res = await handler(post("{}"), {});
    const body = await envelope(res);
    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION");
    expect(body.error.details.fieldErrors).toHaveProperty("question");
  });

  it("hides unexpected errors behind INTERNAL and reports them", async () => {
    const onUnexpectedError = vi.fn();
    const boom = new Error("db password is hunter2");
    const handler = withErrorEnvelope(
      async () => {
        throw boom;
      },
      { onUnexpectedError },
    );
    const res = await handler(post("{}", { [REQUEST_ID_HEADER]: "req-9" }), {});
    const body = await envelope(res);
    expect(res.status).toBe(500);
    expect(body.error.message).toBe("Something broke on our side. It's been logged.");
    expect(JSON.stringify(body)).not.toContain("hunter2");
    expect(body.error.details).toEqual({ requestId: "req-9" });
    expect(onUnexpectedError).toHaveBeenCalledWith(boom, "req-9");
  });
});

describe("parseJsonBody", () => {
  const schema = z.object({ token: z.string().min(1) });

  it("returns parsed data", async () => {
    await expect(parseJsonBody(post('{"token":"t"}'), schema)).resolves.toEqual({ token: "t" });
  });

  it("rejects malformed JSON as VALIDATION", async () => {
    await expect(parseJsonBody(post("{nope"), schema)).rejects.toMatchObject({
      code: "VALIDATION",
      message: "The request body must be JSON.",
    });
  });

  it("rejects schema failures as VALIDATION", async () => {
    await expect(parseJsonBody(post("{}"), schema)).rejects.toMatchObject({ code: "VALIDATION" });
  });
});

describe("parseSearchParams", () => {
  it("coerces and validates query parameters", () => {
    const schema = z.object({ limit: z.coerce.number().int().max(50) });
    expect(parseSearchParams("http://x/?limit=5", schema)).toEqual({ limit: 5 });
    expect(() => parseSearchParams("http://x/?limit=500", schema)).toThrow(AppError);
  });
});

describe("errorResponse", () => {
  it("uses the catalogue message by default", async () => {
    const res = errorResponse("NOT_FOUND");
    expect(res.status).toBe(404);
    expect((await envelope(res)).error.message).toBe("We couldn't find that.");
  });
});
