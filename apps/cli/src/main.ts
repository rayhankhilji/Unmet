import { loadLocalEnv } from "@unmet/shared/node";
import { parseArgs, stringFlag } from "./args.ts";
import { dbReset } from "./commands/db-reset.ts";
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
  default:
    console.error(`Unknown command: ${command ?? "(none)"}. Available: db:reset`);
    process.exitCode = 1;
}
