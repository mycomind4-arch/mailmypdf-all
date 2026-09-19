import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { getOrCreateRequestId, attachRequestId, createRequestLogger } from "./lib/request-id";
import { applySecurityHeaders } from "@/lib/security-headers";
import { clientIpMiddleware } from "@/lib/request-context";

// Security headers middleware — applies CSP, HSTS, X-Frame-Options, etc.
// to every response. Runs first (outermost) so headers are always present.
const securityHeadersMiddleware = createMiddleware().server(async ({ next }) => {
  const response = await next();
  if (response instanceof Response) {
    applySecurityHeaders(response);
  }
  return response;
});

// Request ID middleware — generates a correlation ID for every request,
// attaches it to the response header, and creates a scoped logger.
const requestIdMiddleware = createMiddleware().server(async ({ next, request }) => {
  const requestId = getOrCreateRequestId(request);
  const log = createRequestLogger(requestId);

  try {
    const response = await next();
    if (response instanceof Response) {
      attachRequestId(response, requestId);
    }
    return response;
  } catch (error) {
    log.error("unhandled server error", { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
});

// Error handling middleware — catches unhandled errors and renders a clean error page
const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(error instanceof Error ? (error.stack || error.message) : String(error)), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth, clientIpMiddleware],
  requestMiddleware: [securityHeadersMiddleware, requestIdMiddleware, errorMiddleware],
}));
