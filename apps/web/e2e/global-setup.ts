import { execFileSync } from "node:child_process";

/** Fresh, seeded unmet_e2e database before every local E2E run (TESTING_GUIDE §2). */
export default function globalSetup(): void {
  const run = (script: string) =>
    execFileSync("pnpm", ["--dir", "../..", script, "--env", "e2e"], { stdio: "inherit" });
  run("db:reset");
  run("db:seed");
}
