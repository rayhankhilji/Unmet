import * as Sentry from "@sentry/nextjs";
import { SENTRY_DATA_COLLECTION } from "@unmet/shared";

// Server-side error reporting. Without SENTRY_DSN nothing is initialised and nothing is sent.
// No request bodies or user data leave the server (ARCHITECTURE §14).

export async function register() {
  if (!process.env.SENTRY_DSN) return;
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    tracesSampleRate: 0,
    dataCollection: SENTRY_DATA_COLLECTION,
  });
}

export const onRequestError: typeof Sentry.captureRequestError = (...args) => {
  if (process.env.SENTRY_DSN) Sentry.captureRequestError(...args);
};
