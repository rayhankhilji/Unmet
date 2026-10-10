import { expect, test } from "./fixtures.ts";

// G-SEC-07: security headers on pages and API responses; the CSP nonce reaches inline scripts.

test("pages send the security headers and a nonce-based CSP", async ({ page }) => {
  const response = await page.goto("/");
  const headers = response?.headers() ?? {};
  const csp = headers["content-security-policy"] ?? "";

  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toContain("object-src 'none'");
  expect(csp).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
  expect(csp).not.toContain("'unsafe-eval'");
  expect(headers["strict-transport-security"]).toContain("max-age=63072000");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
  expect(headers["x-powered-by"]).toBeUndefined();

  const nonce = /'nonce-([^']+)'/.exec(csp)?.[1];
  const themeScriptNonce = await page
    .locator("head script")
    .first()
    .evaluate((el) => (el as HTMLScriptElement).nonce);
  expect(themeScriptNonce).toBe(nonce);
});

test("each response gets its own nonce", async ({ request }) => {
  const [a, b] = await Promise.all([request.get("/"), request.get("/")]);
  expect(a.headers()["content-security-policy"]).not.toBe(b.headers()["content-security-policy"]);
});

test("API responses carry the request ID they were given", async ({ request }) => {
  const res = await request.get("/api/v1/health", { headers: { "x-request-id": "e2e-request-1" } });
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ ok: true, db: true });
  expect(res.headers()["x-request-id"]).toBe("e2e-request-1");
  expect(res.headers()["x-content-type-options"]).toBe("nosniff");
});
