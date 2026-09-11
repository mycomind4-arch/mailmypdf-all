/**
 * Cloudflare Pages Functions middleware — applies baseline security headers
 * to every response from this app (API routes and the static SPA shell
 * alike). Runs before every request; see:
 * https://developers.cloudflare.com/pages/functions/middleware/
 */
type MiddlewareContext = { next: () => Promise<Response> };

export const onRequest = async (context: MiddlewareContext): Promise<Response> => {
  const response = await context.next();
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "geolocation=(), camera=(), microphone=()");
  // HSTS only makes sense over HTTPS, which is all Cloudflare Pages serves.
  headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
};
