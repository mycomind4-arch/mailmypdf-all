import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL || "https://placeholder.supabase.co";
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "placeholder-anon-key";
const isBrowser =
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

// Node <22 has no native WebSocket, which @supabase/realtime-js requires even
// when realtime isn't used. Fall back to the `ws` package during SSR so the
// server render doesn't crash; the browser always has a native WebSocket.
// `@vite-ignore` keeps the bundler from statically resolving `ws` (a
// Node-only package) into the browser build, where this branch never runs.
const websocketOption = isBrowser
  ? {}
  : {
      realtime: {
        transport: (await import(/* @vite-ignore */ "ws"))
          .default as unknown as typeof WebSocket,
      },
    };

export const supabase: SupabaseClient = createClient(url, anonKey, {
  auth: {
    persistSession: isBrowser,
    autoRefreshToken: isBrowser,
    detectSessionInUrl: isBrowser,
  },
  ...websocketOption,
});
