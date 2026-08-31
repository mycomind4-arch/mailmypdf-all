import { createStart, createMiddleware } from "@tanstack/react-start";
const securityHeadersMiddleware = createMiddleware().server(async ({ next }) => {
  const response = await next();
  if (response instanceof Response) {
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  }
  return response;
});
export const startInstance = createStart(() => ({
  requestMiddleware: [securityHeadersMiddleware],
}));
