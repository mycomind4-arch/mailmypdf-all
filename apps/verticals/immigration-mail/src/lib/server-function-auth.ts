import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "./supabase";
import { requireAuthenticatedUser } from "./auth-guard";

/**
 * Canonical Immigration Mail account boundary for TanStack Start server
 * functions — mirrors Private Office's server-function-auth.ts. The client
 * side attaches the current Supabase access token; the server validates it
 * again before the function executes.
 */
export const accountAuthMiddleware = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) throw new Error("Authentication required.");

    const authedFetch: typeof fetch = async (input, init = {}) => {
      const headers = new Headers(init.headers);
      headers.set("Authorization", `Bearer ${accessToken}`);
      return fetch(input, { ...init, headers });
    };
    return next({ fetch: authedFetch });
  })
  .server(async ({ next, request }) => {
    const user = await requireAuthenticatedUser(request);
    return next({ context: { user } });
  });
