import { createHash } from "node:crypto";

/** JSON with object keys sorted at every level, so equal requests hash equally. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => [k, sortKeys(v)]),
    );
  }
  return value;
}

/** Fixture key for a Messages API request: SHA-256 of (model, system, messages, tools). */
export function anthropicRequestHash(body: Record<string, unknown>): string {
  const { model, system, messages, tools } = body;
  return createHash("sha256")
    .update(canonicalJson({ model, system, messages, tools }))
    .digest("hex");
}
