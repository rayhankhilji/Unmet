import { seededRandom } from "./random.ts";

export const DEFAULT_DIMENSIONS = 1536;

export function normalize(v: readonly number[]): number[] {
  const norm = Math.hypot(...v);
  if (norm === 0) throw new Error("Cannot normalise a zero vector");
  return v.map((x) => x / norm);
}

export function dot(a: readonly number[], b: readonly number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] ?? 0) * (b[i] ?? 0);
  return sum;
}

export function cosine(a: readonly number[], b: readonly number[]): number {
  return dot(a, b) / (Math.hypot(...a) * Math.hypot(...b));
}

/** A unit vector fully determined by `text`: same text, same embedding, on every machine. */
export function deterministicEmbedding(text: string, dimensions = DEFAULT_DIMENSIONS): number[] {
  const next = seededRandom(`embedding:${text}`);
  // Box–Muller gives a direction uniform on the sphere once normalised.
  const raw = Array.from({ length: dimensions }, () => {
    const u = 1 - next();
    const v = next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  });
  return normalize(raw);
}

/**
 * A unit vector whose cosine similarity with `base` is exactly `similarity`, for clustering
 * tests that need signals just inside or outside the 0.80 threshold.
 */
export function nearTo(base: readonly number[], similarity: number, seed: string): number[] {
  if (similarity < -1 || similarity > 1) throw new RangeError("similarity must be in [-1, 1]");
  const unitBase = normalize(base);
  const random = deterministicEmbedding(`near:${seed}`, unitBase.length);
  const projection = dot(random, unitBase);
  const orthogonal = normalize(random.map((x, i) => x - projection * (unitBase[i] ?? 0)));
  const sin = Math.sqrt(1 - similarity * similarity);
  return unitBase.map((x, i) => similarity * x + sin * (orthogonal[i] ?? 0));
}

export function mean(vectors: readonly (readonly number[])[]): number[] {
  const first = vectors[0];
  if (!first) throw new Error("mean() needs at least one vector");
  const sum = new Array<number>(first.length).fill(0);
  for (const v of vectors)
    for (let i = 0; i < sum.length; i++) sum[i] = (sum[i] ?? 0) + (v[i] ?? 0);
  return sum.map((x) => x / vectors.length);
}
