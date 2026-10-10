import { ErrorEnvelope } from "@unmet/shared";
import { env } from "@/server/env";
import { resetLimiters } from "@/server/rate-limit";
import { ADMIN_COOKIE, signAdminSession } from "@/server/session";

export const APP_ORIGIN = new URL(env.APP_URL).origin;

export function apiRequest(
  path: string,
  init: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
): Request {
  return new Request(new URL(path, APP_ORIGIN), {
    method: init.method ?? "GET",
    headers: { "content-type": "application/json", ...init.headers },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

export const adminCookie = () => `${ADMIN_COOKIE}=${signAdminSession(env.ADMIN_COOKIE_SECRET)}`;

export async function errorOf(res: Response) {
  return ErrorEnvelope.parse(await res.json()).error;
}

export { resetLimiters };
