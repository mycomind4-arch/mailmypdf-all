/**
 * Security headers middleware for MailMyPDF.
 *
 * Applies HTTP security headers to all responses:
 * - Content-Security-Policy: prevents XSS, clickjacking, injection
 * - Strict-Transport-Security: forces HTTPS
 * - X-Frame-Options: prevents clickjacking
 * - X-Content-Type-Options: prevents MIME sniffing
 * - Referrer-Policy: controls referrer leakage
 * - Permissions-Policy: restricts browser features
 * - X-DNS-Prefetch-Control: prevents DNS prefetch
 *
 * Headers are configurable via environment variables for flexibility
 * across different deployment environments.
 */

import { getConfig } from "@/config";

/**
 * Build the Content-Security-Policy directive.
 *
 * Allows:
 * - Scripts from self, Stripe (js.stripe.com, m.stripe.com), and inline (for TanStack)
 * - Styles from self and inline (for Tailwind/shadcn)
 * - Images from self, data:, and blob:
 * - Connects to self, Stripe APIs, and Lob API
 * - Frames from Stripe (for embedded checkout)
 */
export function buildCspHeader(): string {
  const config = getConfig();
  const isDev = config.stripe.env === "sandbox";

  const directives = [
    "default-src 'self'",
    // Scripts: self + Stripe + inline (needed for TanStack Start hydration)
    isDev
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://m.stripe.com"
      : "script-src 'self' 'unsafe-inline' https://js.stripe.com https://m.stripe.com",
    // Styles: self + inline (Tailwind requires unsafe-inline)
    "style-src 'self' 'unsafe-inline'",
    // Images: self + data: (inline SVGs) + blob: (file previews)
    "img-src 'self' data: blob: https:",
    // Fonts: self
    "font-src 'self'",
    // Connect: self + Stripe APIs + Lob API
    `connect-src 'self' https://api.stripe.com https://api.lob.com ${config.supabase.url}`,
    // Frames: Stripe embedded checkout
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
    // Objects: none (no Flash/Java)
    "object-src 'none'",
    // Base URI: self only
    "base-uri 'self'",
    // Form actions: self + Stripe
    "form-action 'self' https://checkout.stripe.com",
    // No mixed content
    "block-all-mixed-content",
    // Upgrade insecure requests
    "upgrade-insecure-requests",
  ];

  return directives.join("; ");
}

/**
 * Security headers to apply to all responses.
 */
export function getSecurityHeaders(): Record<string, string> {
  const isDev = getConfig().stripe.env === "sandbox";

  return {
    "Content-Security-Policy": buildCspHeader(),
    // HSTS: 1 year, include subdomains, preload (skip in dev/local)
    ...(isDev
      ? {}
      : { "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload" }),
    // Prevent clickjacking
    "X-Frame-Options": "DENY",
    // Prevent MIME sniffing
    "X-Content-Type-Options": "nosniff",
    // Control referrer leakage — only send origin to cross-origin
    "Referrer-Policy": "strict-origin-when-cross-origin",
    // Restrict browser features — we don't need camera, mic, geolocation, etc.
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(self https://js.stripe.com)",
    // Prevent DNS prefetch
    "X-DNS-Prefetch-Control": "off",
    // Cross-Origin policies
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
  };
}

/**
 * Apply security headers to a response.
 * Called from middleware after the response is generated.
 */
export function applySecurityHeaders(response: Response): Response {
  const headers = getSecurityHeaders();
  for (const [key, value] of Object.entries(headers)) {
    // Don't override existing headers (e.g., if the route set its own CSP)
    if (!response.headers.has(key)) {
      response.headers.set(key, value);
    }
  }
  return response;
}
