import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

/**
 * Compatibility hook for authenticated dashboard screens.
 * The route tree remains the source of truth for access control; this hook
 * only exposes the current client-side identity to rendered components.
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    if (!supabase.auth) {
      setLoading(false);
      return;
    }

    supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      setUser(error ? null : data.user);
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}

export type { User };
