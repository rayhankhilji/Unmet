import { describe, expect, it } from "vitest";
import { parseArgs, stringFlag } from "./args.ts";

describe("parseArgs", () => {
  it("reads the command, valued flags and switches", () => {
    const { command, flags } = parseArgs(["db:reset", "--env", "e2e", "--allow-remote"]);
    expect(command).toBe("db:reset");
    expect(stringFlag(flags, "env")).toBe("e2e");
    expect(flags.get("allow-remote")).toBe(true);
    expect(stringFlag(flags, "allow-remote")).toBeUndefined();
  });

  it("ignores stray positional tokens", () => {
    expect(parseArgs(["db:seed", "extra"]).flags.size).toBe(0);
    expect(parseArgs([]).command).toBeUndefined();
  });
});
