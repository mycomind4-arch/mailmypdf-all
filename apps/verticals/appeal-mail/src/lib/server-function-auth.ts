import { createMiddleware } from "@tanstack/react-start";
import { getSupabaseClient, requireAuthenticatedUser } from "../platform/supabase";

/**
 * Canonical Appeal Mail account boundary for TanStack Start server
 * functions — mirrors Immigration Mail's / Private Office's
 * server-function-auth.ts. The client side attaches the current Supabase
 * access token; the server validates it again before the function executes.
 *
 * NOTE: unlike Immigration Mail, Appeal Mail has no eagerly-instantiated,
 * synchronous `supabase` client export — its Supabase client lives at
 * `src/platform/supabase.ts` (not `src/lib/supabase.ts`) as the async
 * `getSupabaseClient()` / `getSupabaseServer()` factories, and
 * `requireAuthenticatedUser` is already exported directly from that same
 * file (there is a separate `src/lib/auth-guard.ts`, but it exports a
 * different, richer set of helpers — requireUser/requireAdmin/etc — not
 * requireAuthenticatedUser). Both are reused here as-is.
 */
export const accountAuthMiddleware = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    const supabase = await getSupabaseClient();
    const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
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
