// Sentry receives errors and stack traces only. Sentry 11 collects request data, cookies,
// DB values and AI prompts by default; all of that is switched off here (ARCHITECTURE §14:
// LLM payloads never go to Sentry; INSTRUCTIONS §8: never log transcripts or comments).
export const SENTRY_DATA_COLLECTION = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
  graphQL: { document: false, variables: false },
  genAI: { inputs: false, outputs: false },
  databaseQueryData: false,
  queues: false,
  stackFrameVariables: false,
};
