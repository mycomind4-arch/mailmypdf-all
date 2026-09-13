import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

// SSR-safe: only enable session persistence in the browser.
// On Cloudflare Workers (SSR), localStorage/window don't exist and would crash.
const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

// SupabaseClient throws if supabaseKey is empty/falsy. Use a placeholder
// when env vars aren't set so the module can still load during SSR/build.
const PLACEHOLDER_URL = 'https://placeholder.supabase.co';
const PLACEHOLDER_KEY = 'placeholder-anon-key';

// Node <22 has no native WebSocket, which @supabase/realtime-js requires even
// when realtime isn't used. Fall back to the `ws` package during SSR so the
// server render doesn't crash; the browser always has a native WebSocket.
// `@vite-ignore` keeps the bundler from statically resolving `ws` (a
// Node-only package) into the browser build, where this branch never runs.
const websocketOption = isBrowser
  ? {}
  : {
      realtime: {
        transport: (await import(/* @vite-ignore */ "ws")).default as unknown as typeof WebSocket,
      },
    };

export const supabase: SupabaseClient = createClient(
  supabaseUrl || PLACEHOLDER_URL,
  supabaseAnonKey || PLACEHOLDER_KEY,
  {
    auth: {
      persistSession: isBrowser,
      autoRefreshToken: isBrowser,
      detectSessionInUrl: isBrowser,
    },
    ...websocketOption,
  },
);
