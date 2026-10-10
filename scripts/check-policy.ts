import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

// G-SEC-01: every mutating route handler calls requireAdmin or requirePasscode from
// apps/web/src/server/policy.ts. Run in CI (TESTING_GUIDE §9 step 4).

const MUTATING = ["POST", "PUT", "PATCH", "DELETE"] as const;
const POLICY_CALL = /\brequire(Admin|Passcode)\(/;

/** Public mutations, each with the reason it needs no admin or passcode. */
export const ALLOWED_PUBLIC: Record<string, string> = {
  "admin/session/route.ts POST": "the admin login itself; origin-checked and rate limited",
};

export type Violation = { file: string; method: string };

export function handlersIn(source: string): Map<string, string> {
  const handlers = new Map<string, string>();
  const pattern = /export\s+const\s+(GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS)\s*=/g;
  const matches = [...source.matchAll(pattern)];
  for (const [i, m] of matches.entries()) {
    const end = matches[i + 1]?.index ?? source.length;
    if (m[1] && m.index !== undefined) handlers.set(m[1], source.slice(m.index, end));
  }
  return handlers;
}

export function checkRoute(file: string, source: string): Violation[] {
  const violations: Violation[] = [];
  for (const [method, body] of handlersIn(source)) {
    if (!(MUTATING as readonly string[]).includes(method)) continue;
    if (ALLOWED_PUBLIC[`${file} ${method}`]) continue;
    if (!POLICY_CALL.test(body)) violations.push({ file, method });
  }
  return violations;
}

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return routeFiles(path);
    return name === "route.ts" ? [path] : [];
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const apiDir = fileURLToPath(new URL("../apps/web/src/app/api/v1", import.meta.url));
  const files = routeFiles(apiDir);
  const violations = files.flatMap((f) => checkRoute(relative(apiDir, f), readFileSync(f, "utf8")));
  for (const v of violations) {
    console.error(`${v.file}: ${v.method} handler never calls requireAdmin() or requirePasscode()`);
  }
  console.log(`check-policy: ${files.length} route files, ${violations.length} violation(s).`);
  if (violations.length > 0) process.exitCode = 1;
}
