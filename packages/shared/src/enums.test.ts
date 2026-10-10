import { describe, expect, it } from "vitest";
import { followerTierFor } from "./enums.ts";

describe("followerTierFor", () => {
  it.each([
    [0, "nano"],
    [9_999, "nano"],
    [10_000, "micro"],
    [99_999, "micro"],
    [100_000, "mid"],
    [1_000_000, "mid"],
    [1_000_001, "macro"],
  ] as const)("%i followers → %s", (count, tier) => {
    expect(followerTierFor(count)).toBe(tier);
  });
});
