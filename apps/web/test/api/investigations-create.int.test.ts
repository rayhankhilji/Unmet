import { investigation } from "@unmet/db/schema";
import { makeBrand, withTestTx } from "@unmet/db/testing";
import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/v1/investigations/route";
import { adminCookie, apiRequest, errorOf } from "./helpers";

const body = (brandId: string) => ({
  brandId,
  question: "Which unmet needs could this brand launch against next?",
});

describe("POST /api/v1/investigations", () => {
  it("T-F13-AC1 rejects a request without a passcode and creates no row", async () => {
    const result = await withTestTx(async (tx) => {
      const brand = await makeBrand();
      const res = await POST(
        apiRequest("/api/v1/investigations", { method: "POST", body: body(brand.id) }),
        {},
      );
      const rows = await tx.$count(investigation);
      return { status: res.status, error: await errorOf(res), rows };
    });
    expect(result).toEqual({
      status: 401,
      error: { code: "PASSCODE_INVALID", message: "That passcode didn't work.", details: {} },
      rows: 0,
    });
  });

  it("rejects a wrong passcode", async () => {
    const res = await POST(
      apiRequest("/api/v1/investigations", {
        method: "POST",
        body: body("0192c3a1-0000-7000-8000-000000000001"),
        headers: { "x-demo-passcode": "not-the-passcode" },
      }),
      {},
    );
    expect(res.status).toBe(401);
  });

  it("validates the body before anything else", async () => {
    const res = await POST(
      apiRequest("/api/v1/investigations", { method: "POST", body: { question: "short" } }),
      {},
    );
    const error = await errorOf(res);
    expect(res.status).toBe(400);
    expect(error.code).toBe("VALIDATION");
    expect(error.details.fieldErrors).toHaveProperty("brandId");
  });

  it.each([
    ["the passcode", { "x-demo-passcode": "test-passcode" }],
    ["an admin session", { cookie: adminCookie() }],
  ])("accepts %s, then stays closed until run creation ships (P4.T6)", async (_label, headers) => {
    const res = await POST(
      apiRequest("/api/v1/investigations", {
        method: "POST",
        body: body("0192c3a1-0000-7000-8000-000000000001"),
        headers,
      }),
      {},
    );
    expect(res.status).toBe(503);
    expect((await errorOf(res)).code).toBe("LIVE_RUNS_DISABLED");
  });
});
