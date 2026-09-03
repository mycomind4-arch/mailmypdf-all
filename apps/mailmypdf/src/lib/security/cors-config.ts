/**
 * CORS Configuration
 *
 * Secure Cross-Origin Resource Sharing policy to prevent CSRF attacks
 * and unauthorized cross-origin requests.
 */

/* ─────────────────────────────────────────────────────────────────────────── */
/* TYPES                                                                       */
/* ─────────────────────────────────────────────────────────────────────────── */

export interface CORSPolicy {
  origin: string[];
  methods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  credentials: boolean;
  maxAge: number;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* CORS CONFIGURATION                                                         */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Get CORS policy based on environment
 */
export function getCORSPolicy(
  environment: "development" | "staging" | "production" = "development"
): CORSPolicy {
  const commonHeaders = [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
    "Access-Control-Request-Method",
    "Access-Control-Request-Headers",
  ];

  const commonExposedHeaders = [
    "Content-Type",
    "X-Total-Count",
    "X-Page-Count",
    "RateLimit-Limit",
    "RateLimit-Remaining",
    "RateLimit-Reset",
  ];

  switch (environment) {
    case "development":
      return {
        origin: [
          "http://localhost:3000",
          "http://localhost:3001",
          "http://localhost:5173",
          "http://127.0.0.1:3000",
          "http://127.0.0.1:3001",
          "http://127.0.0.1:5173",
        ],
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: commonHeaders,
        exposedHeaders: commonExposedHeaders,
        credentials: true,
        maxAge: 3600, // 1 hour
      };

    case "staging":
      return {
        origin: [
          "https://staging.mailmypdf.com",
          "https://www.staging.mailmypdf.com",
        ],
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: commonHeaders,
        exposedHeaders: commonExposedHeaders,
        credentials: true,
        maxAge: 86400, // 24 hours
      };

    case "production":
      return {
        origin: [
          "https://mailmypdf.com",
          "https://www.mailmypdf.com",
          "https://app.mailmypdf.com",
        ],
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: commonHeaders,
        exposedHeaders: commonExposedHeaders,
        credentials: true,
        maxAge: 86400, // 24 hours
      };

    default:
      throw new Error(`Unknown environment: ${environment}`);
  }
}

/**
 * Validate origin against CORS policy
 */
export function isOriginAllowed(
  origin: string | null,
  policy: CORSPolicy
): boolean {
  if (!origin) return false;

  // Check exact matches
  if (policy.origin.includes(origin)) {
    return true;
  }

  // Check wildcard patterns (optional, use with caution)
  for (const allowed of policy.origin) {
    if (allowed === "*") {
      return true;
    }

    // Only allow specific wildcard patterns (e.g., *.mailmypdf.com)
    if (allowed.includes("*.")) {
      const pattern = allowed.replace("*.", "\\.");
      const regex = new RegExp(`^https?://[^.]+\\.${pattern}$`);
      if (regex.test(origin)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Create CORS headers for response
 */
export function createCORSHeaders(
  origin: string | null,
  policy: CORSPolicy
): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": policy.methods.join(", "),
    "Access-Control-Allow-Headers": policy.allowedHeaders.join(", "),
    "Access-Control-Expose-Headers": policy.exposedHeaders.join(", "),
    "Access-Control-Max-Age": policy.maxAge.toString(),
  };

  // Only set origin header if origin is allowed
  if (isOriginAllowed(origin, policy)) {
    headers["Access-Control-Allow-Origin"] = origin!;
    if (policy.credentials) {
      headers["Access-Control-Allow-Credentials"] = "true";
    }
  }

  return headers;
}

/**
 * Handle CORS preflight request (OPTIONS)
 */
export function handleCORSPreflight(
  request: Request,
  policy: CORSPolicy
): Response {
  const origin = request.headers.get("Origin");
  const requestMethod = request.headers.get("Access-Control-Request-Method");

  // Validate origin and method
  if (!isOriginAllowed(origin, policy)) {
    return new Response("CORS policy violation", { status: 403 });
  }

  if (requestMethod && !policy.methods.includes(requestMethod)) {
    return new Response("Method not allowed", { status: 405 });
  }

  const headers = createCORSHeaders(origin, policy);

  return new Response(null, {
    status: 204,
    headers,
  });
}

/**
 * Apply CORS headers to response
 */
export function applyCORSHeaders(
  response: Response,
  request: Request,
  policy: CORSPolicy
): Response {
  const origin = request.headers.get("Origin");
  const corsHeaders = createCORSHeaders(origin, policy);

  // Create new response with CORS headers
  const newResponse = new Response(response.body, response);

  Object.entries(corsHeaders).forEach(([key, value]) => {
    newResponse.headers.set(key, value);
  });

  return newResponse;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* SECURITY HEADERS                                                            */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Security headers to prevent common attacks
 */
export const SecurityHeaders = {
  // Prevent clickjacking
  "X-Frame-Options": "SAMEORIGIN",

  // Prevent MIME sniffing
  "X-Content-Type-Options": "nosniff",

  // Enable XSS protection
  "X-XSS-Protection": "1; mode=block",

  // Prevent sniffing
  "X-Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",

  // Enforce HTTPS
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",

  // Referrer policy
  "Referrer-Policy": "strict-origin-when-cross-origin",

  // Permissions policy
  "Permissions-Policy": "geolocation=(), microphone=(), camera=()",

  // Content Security Policy (strict)
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",

  // Prevent cache for sensitive data
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  "Pragma": "no-cache",
  "Expires": "0",
};

/**
 * Add security headers to response
 */
export function addSecurityHeaders(response: Response): Response {
  const newResponse = new Response(response.body, response);

  Object.entries(SecurityHeaders).forEach(([key, value]) => {
    newResponse.headers.set(key, value);
  });

  return newResponse;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* CSRF PROTECTION                                                             */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Safe methods that don't need CSRF tokens
 */
export const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

/**
 * Check if request needs CSRF validation
 */
export function needsCSRFValidation(request: Request): boolean {
  const method = request.method.toUpperCase();
  return !SAFE_METHODS.includes(method);
}

/**
 * Validate CSRF token
 */
export function validateCSRFToken(
  token: string | null,
  sessionToken: string
): boolean {
  if (!token) return false;
  return token === sessionToken;
}

/**
 * Generate CSRF token (should be called in session setup)
 */
export function generateCSRFToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
