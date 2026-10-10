import { AppError } from "@unmet/shared";
import { safeEqual, saltedHash } from "./crypto";
import { env } from "./env";
import { clientIp } from "./request";
import { ADMIN_COOKIE, readCookie, verifyAdminSession } from "./session";

// The one place access is decided (ARCHITECTURE §11, G-SEC-01). Every mutating route calls
// requireAdmin or requirePasscode before doing anything else; scripts/check-policy.ts enforces it.

export type Session = { admin: boolean };
export type Readable = { visibility: "private" | "published" };

export const PASSCODE_HEADER = "x-demo-passcode";

export function getSession(req: Request): Session {
  return { admin: verifyAdminSession(env.ADMIN_COOKIE_SECRET, readCookie(req, ADMIN_COOKIE)) };
}

/** Private resources are invisible to non-admins; callers turn `false` into 404, never 403. */
export function canRead(resource: Readable, session: Session): boolean {
  return resource.visibility === "published" || session.admin;
}

/** Cross-site requests can't carry the SameSite=Strict cookie, but the Origin check backs it up (G-SEC-08). */
export function requireSameOrigin(req: Request): void {
  const origin = req.headers.get("origin");
  if (origin !== new URL(env.APP_URL).origin) throw new AppError("FORBIDDEN");
}

export function requireAdmin(req: Request): Session {
  const session = getSession(req);
  if (!session.admin) throw new AppError("NOT_FOUND");
  if (req.method !== "GET" && req.method !== "HEAD") requireSameOrigin(req);
  return session;
}

/** Live-run creation: the demo passcode, or an admin session. Fails closed when no passcode is configured. */
export function requirePasscode(req: Request): Session {
  const session = getSession(req);
  if (session.admin) return session;
  const given = req.headers.get(PASSCODE_HEADER);
  if (!env.DEMO_PASSCODE || !given || !safeEqual(given, env.DEMO_PASSCODE)) {
    throw new AppError("PASSCODE_INVALID");
  }
  return session;
}

export function requesterIpHash(req: Request): string {
  return saltedHash(env.IP_HASH_SALT, clientIp(req));
}
