// Patched: gracefully degrades when Supabase is not configured.
import { createMiddleware } from '@tanstack/react-start'
import { supabase } from './client'

export const attachSupabaseAuth = createMiddleware({ type: 'function' }).client(
  async ({ next }) => {
    let token: string | undefined;
    try {
      const { data } = await supabase.auth.getSession()
      token = data.session?.access_token
    } catch (e) {
      // Supabase not configured — continue without auth
    }
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
)
