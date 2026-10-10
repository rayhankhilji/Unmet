import { describe, expect, it } from "vitest";
import { checkRoute, handlersIn } from "./check-policy.ts";

describe("check-policy", () => {
  it("splits a route file into its handlers", () => {
    const src = "export const GET = route(a);\nexport const POST = route(b);";
    expect([...handlersIn(src).keys()]).toEqual(["GET", "POST"]);
  });

  it("flags a mutating handler without a policy call", () => {
    const src = `export const GET = route(async () => json({}));
export const PATCH = route(async (req) => { await save(req); });`;
    expect(checkRoute("investigations/[id]/route.ts", src)).toEqual([
      { file: "investigations/[id]/route.ts", method: "PATCH" },
    ]);
  });

  it("accepts handlers that call requireAdmin or requirePasscode", () => {
    const src = `export const DELETE = route(async (req) => { requireAdmin(req); });
export const POST = route(async (req) => { requirePasscode(req); });`;
    expect(checkRoute("x/route.ts", src)).toEqual([]);
  });

  it("honours the documented public allowlist", () => {
    expect(
      checkRoute("admin/session/route.ts", "export const POST = route(async () => {});"),
    ).toEqual([]);
  });
});
