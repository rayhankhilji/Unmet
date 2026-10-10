import { describe, expect, it } from "vitest";
import { dbReset, isLocalDatabase } from "./db-reset.ts";

describe("db:reset safety", () => {
  it("recognises local databases", () => {
    expect(isLocalDatabase("postgres://u:p@localhost:5433/unmet")).toBe(true);
    expect(isLocalDatabase("postgres://u:p@127.0.0.1/unmet")).toBe(true);
    expect(isLocalDatabase("postgres://u:p@ep-cool-123.eu-west-2.aws.neon.tech/neondb")).toBe(
      false,
    );
  });

  it("refuses a remote database without --allow-remote", async () => {
    await expect(
      dbReset({ DATABASE_URL: "postgres://u:p@ep-x.neon.tech/neondb" }, { allowRemote: false }),
    ).rejects.toThrow(/Refusing to reset non-local database ep-x.neon.tech/);
  });
});
