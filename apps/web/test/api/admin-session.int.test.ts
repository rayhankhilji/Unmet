import { beforeEach, describe, expect, it } from "vitest";
import { DELETE, POST } from "@/app/api/v1/admin/session/route";
import { env } from "@/server/env";
import { APP_ORIGIN, adminCookie, apiRequest, errorOf, resetLimiters } from "./helpers";

const login = (token: string, headers: Record<string, string> = {}) =>
  POST(
    apiRequest("/api/v1/admin/session", {
      method: "POST",
      body: { token },
      headers: { origin: APP_ORIGIN, "x-forwarded-for": "203.0.113.7", ...headers },
    }),
    {},
  );

beforeEach(resetLimiters);

describe("POST /api/v1/admin/session", () => {
  it("sets a signed, httpOnly, Secure, SameSite=Strict cookie for 12 hours", async () => {
    const res = await login(env.ADMIN_TOKEN);
    expect(res.status).toBe(204);
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(/^unmet_admin=\d+\.[\w-]+; /);
    for (const attr of ["Path=/", "HttpOnly", "SameSite=Strict", "Max-Age=43200", "Secure"]) {
      expect(cookie).toContain(attr);
    }
  });

  it("rejects a wrong token", async () => {
    const res = await login("wrong-token");
    expect(res.status).toBe(401);
    expect((await errorOf(res)).code).toBe("ADMIN_TOKEN_INVALID");
  });

  it("G-SEC-08 rejects a foreign Origin with 403", async () => {
    const res = await login(env.ADMIN_TOKEN, { origin: "https://evil.example" });
    expect(res.status).toBe(403);
    expect((await errorOf(res)).code).toBe("FORBIDDEN");
  });

  it("G-SEC-06 allows 5 attempts per IP per 15 minutes", async () => {
    for (let i = 0; i < 5; i++) expect((await login("wrong")).status).toBe(401);
    const blocked = await login(env.ADMIN_TOKEN);
    const error = await errorOf(blocked);
    expect(blocked.status).toBe(429);
    expect(error.code).toBe("RATE_LIMITED");
    expect(error.details.retryAfterSeconds).toBeGreaterThan(0);
    expect((await login(env.ADMIN_TOKEN, { "x-forwarded-for": "198.51.100.2" })).status).toBe(204);
  });
});

describe("DELETE /api/v1/admin/session", () => {
  it("is invisible without a session", async () => {
    const res = await DELETE(
      apiRequest("/api/v1/admin/session", { method: "DELETE", headers: { origin: APP_ORIGIN } }),
      {},
    );
    expect(res.status).toBe(404);
  });

  it("clears the cookie for an admin", async () => {
    const res = await DELETE(
      apiRequest("/api/v1/admin/session", {
        method: "DELETE",
        headers: { origin: APP_ORIGIN, cookie: adminCookie() },
      }),
      {},
    );
    expect(res.status).toBe(204);
    expect(res.headers.get("set-cookie")).toContain(
      "unmet_admin=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0",
    );
  });

  it("requires a same-origin request even with a valid session", async () => {
    const res = await DELETE(
      apiRequest("/api/v1/admin/session", { method: "DELETE", headers: { cookie: adminCookie() } }),
      {},
    );
    expect(res.status).toBe(403);
  });
});
