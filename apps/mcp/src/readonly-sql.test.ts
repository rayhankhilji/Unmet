import { describe, expect, it } from "vitest";
import { checkReadOnlySql } from "./readonly-sql.ts";

describe("checkReadOnlySql", () => {
  it.each([
    "select count(*) from video",
    "  -- note\nWITH x AS (select 1) select * from x;",
    "explain select * from signal",
    "/* c */ table brand",
  ])("accepts %s", (sql) => {
    expect(checkReadOnlySql(sql).ok).toBe(true);
  });

  it.each([
    ["delete from video", /Only SELECT/],
    ["select 1; drop table video", /One statement/],
    ["", /Empty/],
    ["-- only a comment", /Empty/],
    ["update investigation set visibility = 'published'", /Only SELECT/],
  ])("rejects %s", (sql, reason) => {
    const result = checkReadOnlySql(sql);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(reason);
  });
});
