import { type NextRequest, NextResponse } from "next/server";

// Runs before every page and API request: assigns the request ID and a per-request CSP
// nonce (ARCHITECTURE §11, G-SEC-07). Static security headers live in next.config.ts.

const REQUEST_ID = "x-request-id";

export function contentSecurityPolicy(
  nonce: string,
  { dev, https }: { dev: boolean; https: boolean },
): string {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://*.r2.cloudflarestorage.com",
    "font-src 'self'",
    "connect-src 'self' https://*.posthog.com https://*.sentry.io",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  if (https) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

export function proxy(request: NextRequest) {
  const requestId = request.headers.get(REQUEST_ID) ?? crypto.randomUUID();
  const nonce = btoa(crypto.randomUUID());
  const csp = contentSecurityPolicy(nonce, {
    dev: process.env.NODE_ENV === "development",
    https: request.nextUrl.protocol === "https:",
  });

  const headers = new Headers(request.headers);
  headers.set(REQUEST_ID, requestId);
  headers.set("x-nonce", nonce);
  headers.set("content-security-policy", csp);

  const response = NextResponse.next({ request: { headers } });
  response.headers.set(REQUEST_ID, requestId);
  response.headers.set("content-security-policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|textures/).*)",
      missing: [{ type: "header", key: "next-router-prefetch" }],
    },
  ],
};
