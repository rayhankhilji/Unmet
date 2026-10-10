import { type Queryable, withDbOverride } from "@unmet/db";
import { withTestTx } from "@unmet/db/testing";
import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/v1/health/route";
import { apiRequest } from "./helpers";

describe("GET /api/v1/health", () => {
  it("reports a reachable database", async () => {
    const res = await withTestTx(() => GET(apiRequest("/api/v1/health"), {}));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, db: true });
    expect(res.headers.get("x-request-id")).toBeTruthy();
  });

  it("returns 503 when the database is unreachable", async () => {
    const broken = {
      execute: async () => {
        throw new Error("connection refused");
      },
    } as unknown as Queryable;
    const res = await withDbOverride(broken, () => GET(apiRequest("/api/v1/health"), {}));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, db: false });
  });
});
