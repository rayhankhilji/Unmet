import { describe, expect, it } from "vitest";
import { hashSeed, seededRandom, seededUuid } from "./random.ts";
import { cosine, deterministicEmbedding, mean, nearTo, normalize } from "./vectors.ts";

describe("seeded randomness", () => {
  it("repeats the same stream for the same seed", () => {
    const a = seededRandom("x");
    const b = seededRandom("x");
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(seededRandom(1)()).not.toBe(seededRandom(2)());
    expect(hashSeed("abc")).toBe(hashSeed("abc"));
  });

  it("produces valid, repeatable v7-layout UUIDs", () => {
    const ids = seededUuid("seed");
    const again = seededUuid("seed");
    const first = ids();
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(again()).toBe(first);
    expect(ids()).not.toBe(first);
  });
});

describe("vectors", () => {
  it("makes unit-length deterministic embeddings", () => {
    const v = deterministicEmbedding("a sunscreen that does not pill");
    expect(v).toHaveLength(1536);
    expect(Math.hypot(...v)).toBeCloseTo(1, 10);
    expect(deterministicEmbedding("a sunscreen that does not pill")).toEqual(v);
    expect(cosine(v, deterministicEmbedding("something else"))).toBeLessThan(0.2);
  });

  it.each([0.95, 0.8, 0.79, 0.1])("nearTo hits cosine %f exactly", (similarity) => {
    const base = deterministicEmbedding("base");
    expect(cosine(base, nearTo(base, similarity, "s"))).toBeCloseTo(similarity, 10);
  });

  it("guards bad input", () => {
    expect(() => nearTo([1, 0], 1.5, "s")).toThrow(RangeError);
    expect(() => normalize([0, 0])).toThrow();
    expect(() => mean([])).toThrow();
    expect(
      mean([
        [1, 3],
        [3, 5],
      ]),
    ).toEqual([2, 4]);
  });
});
