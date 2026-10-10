// Error reporting hook. Sentry is wired in P0.T10; until a DSN is set this is a no-op.
export function reportError(_error: unknown, _context: Record<string, string>): void {}
