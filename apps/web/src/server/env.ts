import { createEnv } from "@t3-oss/env-nextjs";
import { EnvError } from "@unmet/shared";
import { z } from "zod";
import { refineWebEnv, webClientShape, webServerShape } from "./env-schema.ts";

/** Validated once at boot; a missing variable stops the server with its name (G-SEC-09). */
export const env = createEnv({
  server: webServerShape,
  client: webClientShape,
  experimental__runtimeEnv: {
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  },
  emptyStringAsUndefined: true,
  skipValidation: process.env.SKIP_ENV_VALIDATION === "1",
  onValidationError: (issues) => {
    throw new EnvError("web", issues);
  },
  createFinalSchema: (shape) => z.object(shape).superRefine(refineWebEnv),
});
