// Deterministic randomness for fixtures and tests (TESTING_GUIDE §4.6). Pure JS so it runs
// anywhere the shared package does.

/** 32-bit string hash (xmur3) used to seed the PRNG. */
export function hashSeed(input: string): number {
  let h = 1779033703 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    h = Math.imul(h ^ input.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  h ^= h >>> 16;
  return h >>> 0;
}

/** mulberry32: small, fast, good enough for fixtures. Returns floats in [0, 1). */
export function seededRandom(seed: number | string): () => number {
  let a = typeof seed === "string" ? hashSeed(seed) : seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** UUIDs in v7 layout (version and variant bits set) drawn from a seeded stream. */
export function seededUuid(seed: number | string): () => string {
  const next = seededRandom(seed);
  return () => {
    const bytes = Array.from({ length: 16 }, () => Math.floor(next() * 256));
    bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x70;
    bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
    const hex = bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  };
}
