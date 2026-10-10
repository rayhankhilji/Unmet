import { ErrorEnvelope } from "@unmet/shared";
import type { z } from "zod";

// The only client-side fetch layer (INSTRUCTIONS §7). Responses are parsed with the shared
// schemas so the UI never trusts an unexpected shape.

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiGet<S extends z.ZodType>(
  path: `/api/v1/${string}`,
  schema: S,
): Promise<z.output<S>> {
  const res = await fetch(path, { headers: { accept: "application/json" } });
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const envelope = ErrorEnvelope.safeParse(body);
    if (envelope.success) {
      const { code, message, details } = envelope.data.error;
      throw new ApiError(res.status, code, message, details);
    }
    throw new ApiError(res.status, "INTERNAL", "Something broke on our side. It's been logged.");
  }
  return schema.parse(body);
}
