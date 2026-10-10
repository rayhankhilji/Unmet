import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/** Constant-time string comparison; hashing first makes unequal lengths safe too. */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function hmac(secret: string, value: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

/** sha256(salt + value): how requester IPs are stored (G-SEC-11). */
export function saltedHash(salt: string, value: string): string {
  return createHash("sha256")
    .update(salt + value)
    .digest("hex");
}
