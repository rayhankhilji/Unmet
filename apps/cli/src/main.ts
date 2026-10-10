import { fileURLToPath } from "node:url";
import { loadLocalEnv } from "@unmet/shared/node";
import { parseArgs, stringFlag } from "./args.ts";
import { dbReset } from "./commands/db-reset.ts";
import { dbSeed } from "./commands/db-seed.ts";
import { loadCliBaseEnv } from "./env.ts";

// Commands are registered here as phases land (INSTRUCTIONS §5).
const { command, flags } = parseArgs(process.argv.slice(2));
loadLocalEnv({ env: stringFlag(flags, "env") });

switch (command) {
  case "db:reset": {
    const env = loadCliBaseEnv();
    await dbReset(env, { allowRemote: flags.get("allow-remote") === true });
    console.info(`Database reset and migrated (${new URL(env.DATABASE_URL).pathname.slice(1)}).`);
    break;
  }
  case "db:seed": {
    const env = loadCliBaseEnv();
    const root = fileURLToPath(new URL("../../..", import.meta.url));
    const summary = await dbSeed(env, { root, e2e: stringFlag(flags, "env") === "e2e" });
    console.info(
      `Seeded ${summary.brands} brand(s), ${summary.videos} videos from ${summary.creators} creators, ${summary.signals} signals, 3 investigations${summary.evalRuns ? `, ${summary.evalRuns} eval runs` : ""}.`,
    );
    console.info(
      `Published demo investigation: /investigations/${summary.investigations.published}`,
    );
    break;
  }
  default:
    console.error(`Unknown command: ${command ?? "(none)"}. Available: db:reset, db:seed`);
    process.exitCode = 1;
}
