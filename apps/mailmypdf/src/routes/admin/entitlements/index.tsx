/**
 * Admin Entitlements Manager
 *
 * Allows admins to:
 * - Search for users and organizations
 * - View current entitlements
 * - Assign policies
 * - Edit/revoke assignments
 * - View audit trail
 *
 * Access: Admin users only
 */

import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Search, Plus, Edit, Trash2, Eye, ChevronDown } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { searchUsers, searchOrganizations, getEntitlements, getAuditLog } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/entitlements/")({
  component: AdminEntitlementsManager,
  beforeLoad: async ({ context }) => {
    // TODO: Add admin role check
    if (!context.user) {
      throw redirect({ to: "/auth" });
    }
  },
});

type SearchType = "user" | "organization";

interface SearchResult {
  type: SearchType;
  id: string;
  name: string;
  email?: string;
  memberCount?: number;
}

interface EntitlementAssignment {
  id: string;
  policySlug: string;
  policyName: string;
  profileName: string;
  status: "active" | "paused" | "expired";
  expiresAt?: string;
  assignedBy: string;
  assignedAt: string;
}

interface AuditEntry {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  actorEmail: string;
  newValues: Record<string, any>;
  createdAt: string;
}

function AdminEntitlementsManager() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<SearchType>("user");
  const [selectedEntity, setSelectedEntity] = useState<SearchResult | null>(null);
  const [showNewAssignment, setShowNewAssignment] = useState(false);

  // Search results
  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ["search-entities", searchQuery, searchType],
    queryFn: async () => {
      if (!searchQuery) return [];
      if (searchType === "user") {
        return await searchUsers.fetch({ query: searchQuery });
      } else {
        return await searchOrganizations.fetch({ query: searchQuery });
      }
    },
    enabled: searchQuery.length > 2,
  });

  // Selected entity's entitlements
  const { data: entitlements, isLoading: entitlementsLoading } = useQuery({
    queryKey: ["entity-entitlements", selectedEntity?.id],
    queryFn: () => {
      if (!selectedEntity) return null;
      return getEntitlements.fetch({
        type: selectedEntity.type,
        id: selectedEntity.id,
      });
    },
    enabled: !!selectedEntity,
  });

  // Audit log for selected entity
  const { data: auditLog } = useQuery({
    queryKey: ["audit-log", selectedEntity?.id],
    queryFn: () => {
      if (!selectedEntity) return [];
      return getAuditLog.fetch({
        type: selectedEntity.type,
        id: selectedEntity.id,
      });
    },
    enabled: !!selectedEntity,
  });

  return (
    <div className="min-h-screen bg-paper">
      {/* Header */}
      <header className="border-b border-rule/60 bg-paper sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-serif text-3xl">Entitlements</h1>
              <p className="text-sm text-ink-soft">Manage user and organization access</p>
            </div>
            <Link
              to="/admin/policies"
              className="inline-flex items-center gap-2 rounded-full border border-rule bg-card px-4 py-2 text-sm font-medium hover:bg-paper-deep transition-colors"
            >
              <Edit className="h-4 w-4" />
              Manage Policies
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Search Panel */}
          <div className="lg:col-span-1">
            <div className="rounded-lg border border-rule/60 bg-card p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Search Type</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSearchType("user")}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      searchType === "user"
                        ? "bg-cobalt text-white"
                        : "border border-rule text-ink-soft hover:bg-paper-deep"
                    }`}
                  >
                    Users
                  </button>
                  <button
                    onClick={() => setSearchType("organization")}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      searchType === "organization"
                        ? "bg-cobalt text-white"
                        : "border border-rule text-ink-soft hover:bg-paper-deep"
                    }`}
                  >
                    Organizations
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-soft" />
                  <input
                    type="text"
                    placeholder={searchType === "user" ? "Email or name..." : "Name or slug..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-rule bg-paper text-sm focus:outline-none focus:ring-2 focus:ring-cobalt"
                  />
                </div>
              </div>

              {/* Search Results */}
              {searchQuery.length > 2 && (
                <div className="space-y-2">
                  {searchLoading ? (
                    <p className="text-sm text-ink-soft text-center py-4">Searching...</p>
                  ) : searchResults?.length === 0 ? (
                    <p className="text-sm text-ink-soft text-center py-4">No results found</p>
                  ) : (
                    <div className="space-y-2">
                      {searchResults?.map((result) => (
                        <button
                          key={`${result.type}-${result.id}`}
                          onClick={() => setSelectedEntity(result)}
                          className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                            selectedEntity?.id === result.id
                              ? "bg-cobalt text-white"
                              : "border border-rule hover:bg-paper-deep"
                          }`}
                        >
                          <p className="font-medium text-sm">{result.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {result.email || `${result.memberCount} members`}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Details Panel */}
          <div className="lg:col-span-2 space-y-6">
            {!selectedEntity ? (
              <div className="rounded-lg border border-rule/60 bg-card p-12 text-center">
                <Search className="h-12 w-12 mx-auto mb-4 text-ink-soft" />
                <p className="text-ink-soft">Search for a user or organization to manage entitlements</p>
              </div>
            ) : (
              <>
                {/* Entity Info */}
                <div className="rounded-lg border border-rule/60 bg-card p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="font-serif text-2xl">{selectedEntity.name}</h2>
                      <p className="text-sm text-ink-soft">
                        {selectedEntity.type === "user"
                          ? selectedEntity.email
                          : `${selectedEntity.memberCount} members`}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowNewAssignment(true)}
                      className="inline-flex items-center gap-2 rounded-full bg-cobalt text-white px-4 py-2 text-sm font-medium hover:-translate-y-0.5 transition-transform"
                    >
                      <Plus className="h-4 w-4" />
                      New Assignment
                    </button>
                  </div>
                </div>

                {/* Current Entitlements */}
                <div className="rounded-lg border border-rule/60 bg-card p-6">
                  <h3 className="font-serif text-xl mb-4">Active Entitlements</h3>
                  {entitlementsLoading ? (
                    <p className="text-sm text-ink-soft">Loading...</p>
                  ) : entitlements && entitlements.length > 0 ? (
                    <div className="space-y-3">
                      {entitlements.map((assignment: EntitlementAssignment) => (
                        <EntitlementRow
                          key={assignment.id}
                          assignment={assignment}
                          onEdit={() => {
                            // TODO: Show edit modal
                          }}
                          onRevoke={() => {
                            // TODO: Show revoke confirmation
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-ink-soft">No active entitlements</p>
                  )}
                </div>

                {/* Audit Trail */}
                {auditLog && auditLog.length > 0 && (
                  <div className="rounded-lg border border-rule/60 bg-card p-6">
                    <h3 className="font-serif text-xl mb-4">Audit Trail</h3>
                    <div className="space-y-2 text-sm">
                      {auditLog.map((entry: AuditEntry) => (
                        <div key={entry.id} className="flex items-start justify-between border-t border-rule/40 pt-3 first:border-0 first:pt-0">
                          <div>
                            <p className="font-medium">{entry.action}</p>
                            <p className="text-xs text-ink-soft">{entry.actorEmail}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(entry.createdAt), "MMM d, yyyy")}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* New Assignment Modal */}
      {showNewAssignment && selectedEntity && (
        <NewAssignmentModal
          entity={selectedEntity}
          onClose={() => setShowNewAssignment(false)}
          onSuccess={() => {
            setShowNewAssignment(false);
            // TODO: Refresh entitlements query
          }}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */

function EntitlementRow({
  assignment,
  onEdit,
  onRevoke,
}: {
  assignment: EntitlementAssignment;
  onEdit: () => void;
  onRevoke: () => void;
}) {
  const statusColors = {
    active: "text-green-600 bg-green-50",
    paused: "text-amber-600 bg-amber-50",
    expired: "text-red-600 bg-red-50",
  };

  return (
    <div className="flex items-start justify-between rounded-lg border border-rule/40 bg-paper-deep p-3">
      <div className="flex-1">
        <p className="font-medium">{assignment.policyName}</p>
        <p className="text-xs text-ink-soft">{assignment.profileName}</p>
        <div className="mt-2 flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[assignment.status]}`}>
            {assignment.status}
          </span>
          {assignment.expiresAt && (
            <span className="text-xs text-ink-soft">
              Expires {format(new Date(assignment.expiresAt), "MMM d, yyyy")}
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onEdit}
          className="p-2 rounded-lg border border-rule hover:bg-card transition-colors"
          title="Edit"
        >
          <Edit className="h-4 w-4" />
        </button>
        <button
          onClick={onRevoke}
          className="p-2 rounded-lg border border-rule hover:bg-red-50 text-red-600 transition-colors"
          title="Revoke"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

interface NewAssignmentModalProps {
  entity: SearchResult;
  onClose: () => void;
  onSuccess: () => void;
}

function NewAssignmentModal({ entity, onClose, onSuccess }: NewAssignmentModalProps) {
  const [selectedPolicy, setSelectedPolicy] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: policies } = useQuery({
    queryKey: ["policies"],
    queryFn: async () => {
      // TODO: Fetch available policies
      return [];
    },
  });

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // TODO: Call create entitlement assignment server function
      onSuccess();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-paper rounded-lg p-6 max-w-md w-full space-y-4">
        <h2 className="font-serif text-2xl">New Assignment</h2>

        <div>
          <label className="block text-sm font-medium mb-2">Policy</label>
          <select
            value={selectedPolicy}
            onChange={(e) => setSelectedPolicy(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-rule bg-card text-sm focus:outline-none focus:ring-2 focus:ring-cobalt"
          >
            <option value="">Select a policy...</option>
            {/* TODO: Map policies to options */}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Expires (optional)</label>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-rule bg-card text-sm focus:outline-none focus:ring-2 focus:ring-cobalt"
          />
        </div>

        <div className="flex gap-2 justify-end pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-rule hover:bg-paper-deep transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedPolicy || isSubmitting}
            className="px-4 py-2 rounded-lg bg-cobalt text-white font-medium hover:bg-cobalt/90 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? "Assigning..." : "Assign"}
          </button>
        </div>
      </div>
    </div>
  );
}
