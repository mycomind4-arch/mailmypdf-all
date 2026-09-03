import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PrivateOfficeChrome } from "@/components/private-office-chrome";
import { CapabilityDashboard } from "@/components/capability-dashboard";
import { useAuth } from "@/lib/use-auth";
import type { UserCapabilityState } from "@/domain/state-engine";

export const Route = createFileRoute("/capabilities")({
  head: () => ({
    meta: [
      {
        title: "What Can I Do Next? — Capability Graph | Private Office",
      },
      {
        name: "description",
        content:
          "Your Private Office capability dashboard. See what you've accomplished, what's available now, and plan the path to your goals. Completing workflows unlocks new capabilities.",
      },
      { name: "robots", content: "index,follow" },
      {
        property: "og:title",
        content: "What Can I Do Next? — Private Office",
      },
      {
        property: "og:description",
        content:
          "Your capability dashboard. See what's possible based on everything you've already completed.",
      },
    ],
  }),
  component: CapabilitiesPage,
});

function CapabilitiesPage() {
  const { user, loading, isConfigured } = useAuth();
  const [capabilityState, setCapabilityState] = useState<UserCapabilityState | null>(null);

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
        if (!cancelled) setCapabilityState(result.state as UserCapabilityState);
      } catch {
        // Supabase not configured — dashboard will use demo state
      }
    })();
    return () => { cancelled = true; };
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

  return (
    <main className="min-h-screen bg-ivory">
      <PrivateOfficeChrome />

      {/* Hero */}
      <section className="border-b border-rule bg-paper">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16">
          <div className="section-kicker">Private Office / Capability Graph</div>
          <h1 className="mt-3 text-4xl leading-tight text-charcoal md:text-5xl">
            What can I do next?
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone">
            Based on everything you've already completed, here's what becomes possible.
            Each step unlocks new capabilities — your matters compound into a life plan.
          </p>
        </div>
      </section>

      <CapabilityDashboard
        initialState={capabilityState ?? undefined}
      />
    </main>
  );
}
