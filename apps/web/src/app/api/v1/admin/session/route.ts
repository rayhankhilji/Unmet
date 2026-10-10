import { AdminSessionInput, AppError, parseJsonBody, requestIdOf } from "@unmet/shared";
import { safeEqual } from "@/server/crypto";
import { env } from "@/server/env";
import { log } from "@/server/log";
import { requesterIpHash, requireAdmin, requireSameOrigin } from "@/server/policy";
import { LIMITS, limiterFor } from "@/server/rate-limit";
import { route } from "@/server/route";
import { adminCookieHeader, clearAdminCookieHeader, signAdminSession } from "@/server/session";

export const dynamic = "force-dynamic";

/** Admin login: 5 attempts per IP per 15 minutes (G-SEC-06), token compared in constant time. */
export const POST = route(async (req) => {
  requireSameOrigin(req);
  const ipHash = requesterIpHash(req);
  const limit = await limiterFor(LIMITS.adminSession, env).limit(ipHash);
  if (!limit.success) {
    throw new AppError("RATE_LIMITED", "Too many attempts. Try again later.", {
      retryAfterSeconds: limit.retryAfterSeconds,
    });
  }
  const { token } = await parseJsonBody(req, AdminSessionInput);
  if (!safeEqual(token, env.ADMIN_TOKEN)) {
    log.warn("admin login rejected", { requestId: requestIdOf(req) });
    throw new AppError("ADMIN_TOKEN_INVALID");
  }
  return new Response(null, {
    status: 204,
    headers: { "set-cookie": adminCookieHeader(signAdminSession(env.ADMIN_COOKIE_SECRET), true) },
  });
});

export const DELETE = route(async (req) => {
  requireAdmin(req);
  return new Response(null, {
    status: 204,
    headers: { "set-cookie": clearAdminCookieHeader(true) },
  });
});
