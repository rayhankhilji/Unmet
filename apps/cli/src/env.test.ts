import { describe, expect, it } from "vitest";
import { loadCliBaseEnv, loadCliPipelineEnv } from "./env.ts";

const db = { DATABASE_URL: "postgres://unmet:unmet@localhost:5433/unmet" };

describe("cli env", () => {
  it("needs only the database for database commands", () => {
    expect(loadCliBaseEnv(db).DATABASE_URL).toBe(db.DATABASE_URL);
  });

  it("requires provider keys and the comment salt for pipeline commands", () => {
    expect(() => loadCliPipelineEnv(db)).toThrow(
      /ANTHROPIC_API_KEY.*OPENAI_API_KEY.*COMMENT_HASH_SALT/,
    );
  });

  it("rejects a short comment hash salt", () => {
    expect(() =>
      loadCliPipelineEnv({
        ...db,
        ANTHROPIC_API_KEY: "k",
        OPENAI_API_KEY: "k",
        COMMENT_HASH_SALT: "short",
      }),
    ).toThrow(/COMMENT_HASH_SALT \(must be at least 32 characters\)/);
  });
});
