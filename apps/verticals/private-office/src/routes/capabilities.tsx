import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PrivateOfficeChrome } from "@/components/private-office-chrome";
import { CapabilityDashboard } from "@/components/capability-dashboard";
import { useAuth } from "@/lib/use-auth";
import type { UserCapabilityState } from "@/domain/state-engine";

export const Route = createFileRoute("/capabilities")({
  head: () => ({
    meta: [
      { title: "Capability Dashboard | Private Office" },
      {
        name: "description",
        content:
          "Private Office capability dashboard for authenticated users: see established capabilities, available next steps, and goal paths.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: CapabilitiesPage,
});

function CapabilitiesPage() {
  const { user, loading, isConfigured } = useAuth();
  const [capabilityState, setCapabilityState] = useState<UserCapabilityState | null>(null);
  const [stateError, setStateError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isConfigured) {
      setCapabilityState(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { loadCapabilityState } = await import("@/lib/fns/load-capability-state");
        const result = await loadCapabilityState();
        if (!cancelled) {
          setCapabilityState(result.state as UserCapabilityState);
          setStateError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setStateError(
            error instanceof Error ? error.message : "Capability state could not be loaded.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, isConfigured]);

  if (loading) {
    return (
      <main className="min-h-screen bg-ivory">
        <PrivateOfficeChrome />
        <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
          <span className="font-mono text-sm text-stone">Loading capabilities…</span>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-ivory">
        <PrivateOfficeChrome />
        <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <div className="section-kicker">Private Office / Capability Graph</div>
          <h1 className="mt-3 text-4xl text-charcoal">Sign in to view your capability state</h1>
          <p className="mt-4 text-sm leading-relaxed text-stone">
            Capability state is derived from your matters and is not exposed as a public SEO page.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-ivory">
      <PrivateOfficeChrome />
      <section className="border-b border-rule bg-paper">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16">
          <div className="section-kicker">Private Office / Capability Graph</div>
          <h1 className="mt-3 text-4xl leading-tight text-charcoal md:text-5xl">
            What can I do next?
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone">
            Your completed matters establish durable capabilities. Private Office uses that state
            to show what is available now and what prerequisites stand between you and a goal.
          </p>
          {stateError && (
            <p className="mt-4 max-w-2xl rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              {stateError}
            </p>
          )}
        </div>
      </section>
      <CapabilityDashboard initialState={capabilityState ?? undefined} />
    </main>
  );
}
