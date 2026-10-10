import { describe, expect, it } from "vitest";
import { safeEqual } from "@/server/crypto";
import { canRead, getSession, requesterIpHash } from "@/server/policy";
import { MemoryLimiter } from "@/server/rate-limit";
import { clientIp } from "@/server/request";
import { signAdminSession, verifyAdminSession } from "@/server/session";
import { adminCookie, apiRequest } from "./helpers";

describe("admin session cookie (G-SEC-03)", () => {
  const secret = "s".repeat(32);

  it("verifies its own signature until it expires", () => {
    const now = 1_000_000;
    const value = signAdminSession(secret, now);
    expect(verifyAdminSession(secret, value, now + 1)).toBe(true);
    expect(verifyAdminSession(secret, value, now + 12 * 3_600_000)).toBe(false);
  });

  it("rejects tampering, other secrets and junk", () => {
    const value = signAdminSession(secret);
    const [exp, sig] = value.split(".");
    expect(verifyAdminSession(secret, `${Number(exp) + 1000}.${sig}`)).toBe(false);
    expect(verifyAdminSession("t".repeat(32), value)).toBe(false);
    for (const junk of [undefined, "", "abc", "123.", ".sig", "x.y"]) {
      expect(verifyAdminSession(secret, junk)).toBe(false);
    }
  });

  it("is read from the request cookie", () => {
    expect(getSession(apiRequest("/", { headers: { cookie: adminCookie() } })).admin).toBe(true);
    expect(getSession(apiRequest("/", { headers: { cookie: "unmet_admin=1.forged" } })).admin).toBe(
      false,
    );
  });
});

describe("canRead (G-SEC-02)", () => {
  it("hides private resources from everyone but the admin", () => {
    expect(canRead({ visibility: "published" }, { admin: false })).toBe(true);
    expect(canRead({ visibility: "private" }, { admin: false })).toBe(false);
    expect(canRead({ visibility: "private" }, { admin: true })).toBe(true);
  });
});

describe("helpers", () => {
  it("compares secrets in constant time regardless of length", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });

  it("takes the first X-Forwarded-For hop and never stores raw IPs (G-SEC-11)", () => {
    const req = apiRequest("/", { headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" } });
    expect(clientIp(req)).toBe("203.0.113.7");
    expect(clientIp(apiRequest("/", { headers: { "x-real-ip": "198.51.100.9" } }))).toBe(
      "198.51.100.9",
    );
    expect(clientIp(apiRequest("/"))).toBe("unknown");
    expect(requesterIpHash(req)).toMatch(/^[0-9a-f]{64}$/);
    expect(requesterIpHash(req)).not.toContain("203.0.113.7");
  });

  it("limits per key per fixed window", async () => {
    let now = 0;
    const limiter = new MemoryLimiter({ name: "t", max: 2, windowSeconds: 60 }, () => now);
    expect((await limiter.limit("a")).success).toBe(true);
    expect((await limiter.limit("a")).success).toBe(true);
    expect(await limiter.limit("a")).toEqual({ success: false, retryAfterSeconds: 60 });
    expect((await limiter.limit("b")).success).toBe(true);
    now = 60_000;
    expect((await limiter.limit("a")).success).toBe(true);
  });
});
