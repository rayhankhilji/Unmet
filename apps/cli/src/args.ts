export type ParsedArgs = { command: string | undefined; flags: Map<string, string | true> };

/** `<command> [--flag value] [--switch]` — enough for the handful of CLI commands. */
export function parseArgs(argv: readonly string[]): ParsedArgs {
  const [command, ...rest] = argv;
  const flags = new Map<string, string | true>();
  for (let i = 0; i < rest.length; i++) {
    const token = rest[i];
    if (!token?.startsWith("--")) continue;
    const next = rest[i + 1];
    if (next !== undefined && !next.startsWith("--")) {
      flags.set(token.slice(2), next);
      i++;
    } else {
      flags.set(token.slice(2), true);
    }
  }
  return { command, flags };
}

export function stringFlag(flags: ParsedArgs["flags"], name: string): string | undefined {
  const value = flags.get(name);
  return typeof value === "string" ? value : undefined;
}
