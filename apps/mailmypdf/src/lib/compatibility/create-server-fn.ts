/**
 * Compatibility Layer for createServerFn
 *
 * Provides a drop-in replacement for @tanstack/start's createServerFn.
 * In reality, just unwraps the handler and returns a callable async function.
 */

export function createServerFn(options: any, handler?: any) {
  // If handler is provided as second argument
  if (handler) {
    return handler;
  }

  // If handler is in options.handler
  if (options.handler) {
    return options.handler;
  }

  // For object-style configuration { method, async handler() {...} }
  // Return a function that calls the handler
  return async function (data: any) {
    return options.handler ? options.handler({ data }) : null;
  };
}

/**
 * Compatibility wrapper for createAPIFileRoute
 * Returns a regular async function for use in API handlers
 */
export function createAPIFileRoute(config: any) {
  return {
    handler: config.handler || (() => new Response("Not implemented", { status: 501 })),
  };
}
