import { createMiddleware } from "@tanstack/react-start";
import { getBrowserSupabase } from "@/platform/supabase-client";
import { requireAuthenticatedUser } from "@/lib/auth-guard";

/**
 * Canonical Notice Respond account boundary for TanStack Start server
 * functions — mirrors Appeal Mail's / Immigration Mail's / Private Office's
 * server-function-auth.ts. The client side attaches the current Supabase
 * access token; the server validates it again before the function executes.
 *
 * Notice Respond's own auth shape is closer to Immigration Mail's than to
 * Appeal Mail's: server-side verification already lives in
 * `src/lib/auth-guard.ts` as `requireAuthenticatedUser(request)` (it builds
 * its own short-lived Supabase client per call rather than reusing a
 * singleton, but the signature and behavior match exactly, so it's reused
 * as-is here). There was, however, no existing client-side helper to read
 * the current session's access token outside of the `useAuth()` React
 * context (`src/lib/auth.tsx`, whose own Supabase loader is a private,
 * unexported function) — this app's pre-existing `src/platform/supabase-client.ts`
 * only exposed a `process.env`-driven `getSupabase()` used by the case
 * repository, which is not safe to call from the browser (Vite does not
 * expose arbitrary `process.env.*` to client bundles). `getBrowserSupabase()`
 * was added there for this purpose — same `import.meta.env.VITE_*` source
 * `useAuth()` already relies on.
 */
export const accountAuthMiddleware = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    const supabase = getBrowserSupabase();
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
