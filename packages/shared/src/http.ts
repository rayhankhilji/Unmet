import { z } from "zod";
import { AppError, HTTP_ERRORS, type HttpErrorCode } from "./errors.ts";

// Route-handler helpers. Web-standard Request/Response only, so this file has no runtime
// dependencies beyond Zod.

export const REQUEST_ID_HEADER = "x-request-id";

export const ErrorEnvelope = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()),
  }),
});
export type ErrorEnvelope = z.infer<typeof ErrorEnvelope>;

export function requestIdOf(req: Request): string {
  return req.headers.get(REQUEST_ID_HEADER) ?? crypto.randomUUID();
}

export function json(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(body), { ...init, headers });
}

export function errorResponse(
  code: HttpErrorCode,
  message: string = HTTP_ERRORS[code].message,
  details: Record<string, unknown> = {},
  headers?: ConstructorParameters<typeof Headers>[0],
): Response {
  const body: ErrorEnvelope = { error: { code, message, details } };
  return json(body, { status: HTTP_ERRORS[code].status, headers });
}

export function validationError(error: z.ZodError): AppError {
  const flat = z.flattenError(error);
  return new AppError("VALIDATION", undefined, {
    fieldErrors: flat.fieldErrors,
    formErrors: flat.formErrors,
  });
}

export async function parseJsonBody<S extends z.ZodType>(
  req: Request,
  schema: S,
): Promise<z.output<S>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new AppError("VALIDATION", "The request body must be JSON.");
  }
  const result = schema.safeParse(raw);
  if (!result.success) throw validationError(result.error);
  return result.data;
}

export function parseSearchParams<S extends z.ZodType>(url: string | URL, schema: S): z.output<S> {
  const params = Object.fromEntries(new URL(url).searchParams);
  const result = schema.safeParse(params);
  if (!result.success) throw validationError(result.error);
  return result.data;
}

export type RouteHandler<C> = (req: Request, ctx: C) => Promise<Response>;

export type EnvelopeHooks = {
  /** Called for unexpected errors (INTERNAL) so the app can log and report them. */
  onUnexpectedError?: (error: unknown, requestId: string) => void;
};

/**
 * Converts anything a handler throws into the error envelope (ARCHITECTURE §5.1) and
 * stamps every response with the request ID.
 */
export function withErrorEnvelope<C>(
  handler: RouteHandler<C>,
  hooks: EnvelopeHooks = {},
): RouteHandler<C> {
  return async (req, ctx) => {
    const requestId = requestIdOf(req);
    let res: Response;
    try {
      res = await handler(req, ctx);
    } catch (error) {
      res = toErrorResponse(error, requestId, hooks);
    }
    res.headers.set(REQUEST_ID_HEADER, requestId);
    return res;
  };
}

function toErrorResponse(error: unknown, requestId: string, hooks: EnvelopeHooks): Response {
  if (error instanceof AppError) return errorResponse(error.code, error.message, error.details);
  if (error instanceof z.ZodError) {
    const appError = validationError(error);
    return errorResponse(appError.code, appError.message, appError.details);
  }
  hooks.onUnexpectedError?.(error, requestId);
  return errorResponse("INTERNAL", undefined, { requestId });
}
