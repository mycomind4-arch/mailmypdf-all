/**
 * Request context helper for accessing the current request in server functions.
 *
 * Uses TanStack Start middleware to attach the client IP to the server
 * function context, making it available to all server functions.
 */

import { createMiddleware } from "@tanstack/react-start";
import { getClientIp } from "@/lib/rate-limit";

/**
 * Middleware that attaches client IP to the server function context.
 * Use this in the `functionMiddleware` array in start.ts.
 */
export const clientIpMiddleware = createMiddleware().server(async ({ next, request }) => {
  const clientIp = getClientIp(request);
  return next({ context: { clientIp } });
});

/**
 * Get the client IP from a Request object directly.
 * Use this in route handlers that have direct access to the request.
 */
export function ipFromRequest(request: Request): string {
  return getClientIp(request);
}
