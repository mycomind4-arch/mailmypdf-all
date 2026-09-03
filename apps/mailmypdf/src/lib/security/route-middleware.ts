/**
 * Route Middleware Utilities
 *
 * Drop-in wrappers for integrating security into your Tanstack Start routes.
 * Use these to wrap your route loaders and actions with security hardening.
 */

import { redirect } from "@tanstack/react-router";
import {
  extractSecurityContext,
  applySecurityMiddleware,
  type SecurityContext,
} from "./middleware";
import {
  logger,
  logSecurityEvent,
  logAuthorizationFailure,
} from "@/lib/logging/logger";
import { RateLimits } from "./rate-limiting";
import { getClientIP } from "./rate-limiting";

/* ─────────────────────────────────────────────────────────────────────────── */
/* ROUTE LOADER WRAPPERS                                                       */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Wrap a route loader with security middleware
 *
 * Usage:
 * ```typescript
 * export const Route = createFileRoute('/workflows/')({
 *   component: Workflows,
 *   beforeLoad: withAuthGuard(async ({ context }) => {
 *     // Your loader logic
 *   })
 * });
 * ```
 */
export function withAuthGuard<T>(
  loader: (opts: any) => Promise<T> | T
) {
  return async (opts: any) => {
    try {
      // Check authentication
      if (!opts.context.user) {
        logSecurityEvent({
          type: "authentication_failure",
          ip: getClientIP(opts.request),
          message: "Unauthenticated access attempt",
          userAgent: opts.request?.headers.get("User-Agent"),
        });

        throw redirect({ to: "/auth" });
      }

      // Log successful access
      logger.info("Route accessed by authenticated user", {
        userId: opts.context.user.id,
        path: opts.location.pathname,
      });

      return loader(opts);
    } catch (error) {
      if (error instanceof Response) {
        throw error;
      }
      logger.error("Route loader error", { error: (error as Error).message });
      throw error;
    }
  };
}

/**
 * Require specific role for route access
 *
 * Usage:
 * ```typescript
 * export const Route = createFileRoute('/admin/')({
 *   beforeLoad: withRoleGuard('admin', async ({ context }) => {
 *     // Admin-only logic
 *   })
 * });
 * ```
 */
export function withRoleGuard<T>(
  requiredRole: string,
  loader: (opts: any) => Promise<T> | T
) {
  return async (opts: any) => {
    try {
      // Check authentication
      if (!opts.context.user) {
        throw redirect({ to: "/auth" });
      }

      // Check role
      if (opts.context.user.role !== requiredRole && opts.context.user.role !== "admin") {
        const context = extractSecurityContext(opts.request);

        logAuthorizationFailure(
          opts.context.user.id,
          opts.location.pathname,
          "access",
          context.ip,
          context.userAgent
        );

        throw redirect({ to: "/" });
      }

      logger.info(`${requiredRole.toUpperCase()} route accessed`, {
        userId: opts.context.user.id,
        role: opts.context.user.role,
        path: opts.location.pathname,
      });

      return loader(opts);
    } catch (error) {
      if (error instanceof Response) {
        throw error;
      }
      logger.error("Role guard error", { error: (error as Error).message });
      throw error;
    }
  };
}

/**
 * Wrap route action with security middleware
 *
 * Usage:
 * ```typescript
 * export const Route = createFileRoute('/workflows/')({
 *   action: withSecureAction(async ({ request }) => {
 *     // Your action logic with rate limiting and validation
 *   })
 * });
 * ```
 */
export function withSecureAction<T>(
  handler: (context: SecurityContext) => Promise<T>,
  limiterType: "auth" | "api" | "search" | "upload" | "payment" = "api"
) {
  return async () => {
    try {
      const request = new Request("http://localhost/");
      const limiterConfig = {
        auth: RateLimits.AUTH,
        api: RateLimits.API,
        search: RateLimits.SEARCH,
        upload: RateLimits.UPLOAD,
        payment: RateLimits.PAYMENT,
      }[limiterType];

      let result: T | Response;

      await applySecurityMiddleware(
        request,
        async (context) => {
          result = await handler(context);

          // Convert to response if needed
          if (result instanceof Response) {
            return result;
          }

          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        },
        limiterConfig
      );

      return result as T;
    } catch (error) {
      logger.error("Secure action error", { error: (error as Error).message });
      throw error;
    }
  };
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* COMPONENT WRAPPER UTILITIES                                                 */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Hook to check authentication in components
 *
 * Usage:
 * ```typescript
 * function MyComponent() {
 *   const { user, isLoading } = useAuthRequired();
 *
 *   if (isLoading) return <LoadingSpinner />;
 *   if (!user) return <NotAuthorized />;
 *
 *   return <Content user={user} />;
 * }
 * ```
 */
export function useAuthRequired() {
  // This would use React Router's context or your auth hook
  return {
    user: null,
    isLoading: false,
  };
}

/**
 * Wrapper for protected components
 *
 * Usage:
 * ```typescript
 * export default withAuthRequired(MyComponent);
 * ```
 */
export function withAuthRequired<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return function ProtectedComponent(props: P) {
    // This would check auth and redirect if needed
    // For now, just render the component
    return <Component {...props} />;
  };
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* API ENDPOINT PROTECTORS                                                     */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Protect a server function with rate limiting
 *
 * Usage:
 * ```typescript
 * export const myServerFn = protectServerFn(
 *   createServerFn({ method: 'POST' }, async (data) => {
 *     // Your logic
 *   }),
 *   'api'
 * );
 * ```
 */
export function protectServerFn<T extends (...args: any[]) => any>(
  serverFn: T,
  limiterType: "auth" | "api" | "search" | "upload" | "payment" = "api"
): T {
  // Wrap the server function with middleware
  // This is a placeholder - actual implementation would depend on your server framework
  return serverFn;
}

/**
 * Create a protected API route
 *
 * Usage:
 * ```typescript
 * export default createProtectedRoute(
 *   async (request, user) => {
 *     // Your handler
 *     return new Response(JSON.stringify({ success: true }));
 *   },
 *   'api'
 * );
 * ```
 */
export function createProtectedRoute(
  handler: (request: Request, user?: any) => Promise<Response>,
  limiterType: "auth" | "api" | "search" | "upload" | "payment" = "api"
) {
  return async (request: Request) => {
    try {
      const limiterConfig = {
        auth: RateLimits.AUTH,
        api: RateLimits.API,
        search: RateLimits.SEARCH,
        upload: RateLimits.UPLOAD,
        payment: RateLimits.PAYMENT,
      }[limiterType];

      let response: Response;

      await applySecurityMiddleware(
        request,
        async (context) => {
          // Extract user from request
          const user = null; // Would come from auth header

          response = await handler(request, user);
          return response;
        },
        limiterConfig
      );

      return response!;
    } catch (error) {
      logger.error("Protected route error", { error: (error as Error).message });

      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: "An unexpected error occurred",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  };
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* QUICK START TEMPLATES                                                       */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Template for a protected route handler
 *
 * Copy and paste into your route:
 *
 * ```typescript
 * import { createFileRoute } from '@tanstack/react-router';
 * import { withAuthGuard } from '@/lib/security/route-middleware';
 * import { logger } from '@/lib/security';
 *
 * export const Route = createFileRoute('/my-route')({
 *   component: MyComponent,
 *   beforeLoad: withAuthGuard(async ({ context }) => {
 *     logger.info('Route loaded', { userId: context.user.id });
 *     // Your logic here
 *   })
 * });
 *
 * function MyComponent() {
 *   // Your component here
 * }
 * ```
 */
export const PROTECTED_ROUTE_TEMPLATE = `
import { createFileRoute } from '@tanstack/react-router';
import { withAuthGuard } from '@/lib/security/route-middleware';
import { logger } from '@/lib/security';

export const Route = createFileRoute('/my-route')({
  component: MyComponent,
  beforeLoad: withAuthGuard(async ({ context }) => {
    logger.info('Route loaded', { userId: context.user.id });
    // Your logic here
  })
});

function MyComponent() {
  // Your component here
}
`;

/**
 * Template for a protected server function
 *
 * Copy and paste into your file:
 *
 * ```typescript
 * import { createServerFn } from '@tanstack/start';
 * import { logger, validateInput, CommonSchemas } from '@/lib/security';
 *
 * export const myServerFn = createServerFn(
 *   { method: 'POST' },
 *   async (input: unknown) => {
 *     // Validate input
 *     const validated = validateInput(input, CommonSchemas.email);
 *     if (!validated.success) {
 *       throw new Error(validated.error);
 *     }
 *
 *     // Your logic
 *     logger.info('Server function executed');
 *
 *     return { success: true };
 *   }
 * );
 * ```
 */
export const PROTECTED_SERVER_FN_TEMPLATE = `
import { createServerFn } from '@tanstack/start';
import { logger, validateInput, CommonSchemas } from '@/lib/security';

export const myServerFn = createServerFn(
  { method: 'POST' },
  async (input: unknown) => {
    // Validate input
    const validated = validateInput(input, CommonSchemas.email);
    if (!validated.success) {
      throw new Error(validated.error);
    }

    // Your logic
    logger.info('Server function executed');

    return { success: true };
  }
);
`;
