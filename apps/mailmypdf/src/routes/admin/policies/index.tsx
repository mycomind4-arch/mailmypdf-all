/**
 * Policy Manager
 *
 * Manage entitlement policies:
 * - View all policies
 * - Create new policies
 * - Edit existing policies
 * - Toggle features
 *
 * Access: Admin users only
 */

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, Edit, Copy } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { getPolicies } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/policies/")({
  component: PolicyManager,
  beforeLoad: async ({ context }) => {
    // TODO: Add admin role check
    if (!context.user) {
      throw redirect({ to: "/auth" });
    }
  },
});

interface Policy {
  id: string;
  slug: string;
  name: string;
  description?: string;
  profileName: string;
  scope: "user" | "organization" | "global";
}

function PolicyManager() {
  const { data: policies, isLoading } = useQuery({
    queryKey: ["policies"],
    queryFn: () => getPolicies.fetch(),
  });

  return (
    <div className="min-h-screen bg-paper">
      {/* Header */}
      <header className="border-b border-rule/60 bg-paper sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-serif text-3xl">Policies</h1>
              <p className="text-sm text-ink-soft">Create and manage entitlement policies</p>
            </div>
            <Link
              to="/admin/policies/new"
              className="inline-flex items-center gap-2 rounded-full bg-cobalt text-white px-4 py-2 text-sm font-medium hover:-translate-y-0.5 transition-transform"
            >
              <Plus className="h-4 w-4" />
              New Policy
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="text-center py-12 text-ink-soft">Loading policies...</div>
        ) : policies && policies.length > 0 ? (
          <div className="space-y-3">
            {policies.map((policy: Policy) => (
              <PolicyCard key={policy.id} policy={policy} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-rule/60 bg-card p-12 text-center">
            <p className="text-ink-soft mb-4">No policies yet</p>
            <Link
              to="/admin/policies/new"
              className="inline-flex items-center gap-2 text-sm font-medium text-cobalt hover:text-cobalt/80"
            >
              <Plus className="h-4 w-4" />
              Create your first policy
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

function PolicyCard({ policy }: { policy: Policy }) {
  const scopeLabel = {
    user: "User-level",
    organization: "Organization",
    global: "Global",
  };

  return (
    <div className="rounded-lg border border-rule/60 bg-card p-4 hover:border-rule hover:bg-paper-deep transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-serif text-lg">{policy.name}</h3>
          <p className="text-xs text-ink-soft mt-1">
            <code className="font-mono">{policy.slug}</code>
          </p>
          {policy.description && (
            <p className="text-sm text-ink-soft mt-2">{policy.description}</p>
          )}
          <div className="flex gap-2 mt-3">
            <span className="inline-block px-2 py-1 rounded text-xs bg-brass/10 text-brass font-medium">
              {policy.profileName}
            </span>
            <span className="inline-block px-2 py-1 rounded text-xs bg-cobalt/10 text-cobalt font-medium">
              {scopeLabel[policy.scope]}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/admin/policies/${policy.id}`}
            className="p-2 rounded-lg border border-rule hover:bg-paper-deep transition-colors"
            title="Edit"
          >
            <Edit className="h-4 w-4" />
          </Link>
          <button
            className="p-2 rounded-lg border border-rule hover:bg-paper-deep transition-colors"
            title="Duplicate"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
