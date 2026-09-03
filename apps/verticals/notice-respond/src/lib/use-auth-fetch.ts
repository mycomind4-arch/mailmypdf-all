/**
 * useAuthFetch — shared hook that wraps fetch with an Authorization Bearer header.
 *
 * Workflow pages that call server-side LLM endpoints (/api/workflows/analyze,
 * /api/workflows/draft) must include the authenticated user's access token.
 * This hook provides a `authFetch` function that automatically adds the
 * Bearer header from the Supabase session.
 *
 * If the user is not authenticated, `authFetch` throws with a clear message
 * instead of making an unauthenticated request that would get a 401.
 */

import { useCallback } from "react";
import { useAuth } from "@/lib/auth";

export function useAuthFetch() {
  const { accessToken, user } = useAuth();

  const authFetch = useCallback(
    async (input: string, init?: RequestInit): Promise<Response> => {
      if (!user || !accessToken) {
        throw new Error(
          "Authentication required. Sign in to your MailMyPDF Account to use this workflow.",
        );
      }

      const headers = new Headers(init?.headers);
      headers.set("Authorization", `Bearer ${accessToken}`);

      return fetch(input, { ...init, headers });
    },
    [accessToken, user],
  );

  return { authFetch, accessToken, user };
}
