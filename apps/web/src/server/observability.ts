import * as Sentry from "@sentry/nextjs";

/** Reports an unexpected server error to Sentry when a DSN is configured; otherwise a no-op. */
export function reportError(error: unknown, context: Record<string, string>): void {
  if (!process.env.SENTRY_DSN) return;
  Sentry.captureException(error, { tags: context });
}
