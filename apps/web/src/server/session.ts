import { hmac, safeEqual } from "./crypto";

export const ADMIN_COOKIE = "unmet_admin";
export const ADMIN_SESSION_SECONDS = 12 * 60 * 60;

/** `<expiresAtMs>.<hmac>`: no server-side session store needed for a single admin. */
export function signAdminSession(secret: string, now = Date.now()): string {
  const expiresAt = now + ADMIN_SESSION_SECONDS * 1000;
  return `${expiresAt}.${hmac(secret, `admin.${expiresAt}`)}`;
}

export function verifyAdminSession(
  secret: string,
  value: string | undefined,
  now = Date.now(),
): boolean {
  if (!value) return false;
  const [expiresAt, signature] = value.split(".");
  if (!expiresAt || !signature || !/^\d+$/.test(expiresAt)) return false;
  if (Number(expiresAt) <= now) return false;
  return safeEqual(signature, hmac(secret, `admin.${expiresAt}`));
}

export function adminCookieHeader(value: string, secure: boolean): string {
  const attrs = [
    `${ADMIN_COOKIE}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${ADMIN_SESSION_SECONDS}`,
  ];
  if (secure) attrs.push("Secure");
  return attrs.join("; ");
}

export function clearAdminCookieHeader(secure: boolean): string {
  const attrs = [`${ADMIN_COOKIE}=`, "Path=/", "HttpOnly", "SameSite=Strict", "Max-Age=0"];
  if (secure) attrs.push("Secure");
  return attrs.join("; ");
}

export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}
