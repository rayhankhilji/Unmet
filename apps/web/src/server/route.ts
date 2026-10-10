import { type RouteHandler, withErrorEnvelope } from "@unmet/shared";
import { errorFields, log } from "./log";
import { reportError } from "./observability";

/** Every API route goes through this: error envelope, request ID, logged unexpected errors. */
export function route<C>(handler: RouteHandler<C>): RouteHandler<C> {
  return withErrorEnvelope(handler, {
    onUnexpectedError: (error, requestId) => {
      log.error("unhandled route error", { requestId, ...errorFields(error) });
      reportError(error, { requestId });
    },
  });
}
