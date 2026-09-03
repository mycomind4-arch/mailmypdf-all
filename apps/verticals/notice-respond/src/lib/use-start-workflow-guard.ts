/**
 * useStartWorkflowGuard — shared hook that gates "Start workflow" behind authentication.
 *
 * Public visitors can browse workflow landing pages freely. When they click
 * "Start workflow", this hook checks auth: if unauthenticated, it redirects
 * to /auth?returnTo=<current path>. If authenticated, it calls the provided
 * callback to begin the workflow.
 *
 * The return URL is validated to prevent open-redirect attacks.
 */

import { useCallback } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

/**
 * Validate a return-to path to prevent open-redirect attacks.
 * Must be a relative path starting with "/" but not "//".
 */
export function safeReturnTo(raw: string | undefined | null): string {
  if (!raw || typeof raw !== "string") return "/dashboard";
  if (!raw.startsWith("/")) return "/dashboard";
  if (raw.startsWith("//")) return "/dashboard";
  // Block protocol-relative URLs and anything that looks like a URL scheme
  if (/^[a-z]+:/i.test(raw)) return "/dashboard";
  return raw;
}

/**
 * Returns a `startWorkflow` function. When called:
 * - If auth is still loading, does nothing (button should be disabled).
 * - If the user is unauthenticated, redirects to /auth?returnTo=<current path>.
 * - If the user is authenticated, calls the provided `onStart` callback.
 */
export function useStartWorkflowGuard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const startWorkflow = useCallback(
    (onStart: () => void) => {
      if (loading) return; // Wait for auth to resolve

      if (!user) {
        // Preserve the workflow they selected — redirect to sign in,
        // then return them directly to this workflow after auth.
        const returnTo = safeReturnTo(location.pathname);
        navigate({ to: "/auth", search: { returnTo } });
        return;
      }

      // Authenticated — start the workflow
      onStart();
    },
    [user, loading, navigate, location.pathname],
  );

  return { startWorkflow, canStart: !loading, isAuthenticated: !!user };
}
