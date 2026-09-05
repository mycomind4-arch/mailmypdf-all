import { authenticatedHeaders } from "@/lib/authenticated-client";
/**
 * Admin: Entitlements Manager (Phase 2)
 *
 * Admin interface for:
 * - Viewing all active entitlements
 * - Assigning policies to users/organizations
 * - Managing expiration dates
 * - Viewing usage metrics
 *
 * Protected route - admin only
 */

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { adminListEntitlements } from "@/lib/entitlements-management.functions";
import { adminAssignEntitlement } from "@/lib/entitlements-management.functions";

export const Route = createFileRoute("/_authenticated/admin/entitlements")({
  component: AdminEntitlementsPage,
});

function AdminEntitlementsPage() {
  const [activeTab, setActiveTab] = useState<"list" | "assign">("list");
  const [entitlements, setEntitlements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
            Entitlements Manager
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage user policies, assignments, and quotas
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-8">
            <TabButton
              active={activeTab === "list"}
              onClick={() => setActiveTab("list")}
              label="Active Entitlements"
            />
            <TabButton
              active={activeTab === "assign"}
              onClick={() => setActiveTab("assign")}
              label="Assign Policy"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {activeTab === "list" && <EntitlementsList />}
        {activeTab === "assign" && <AssignPolicyForm />}
      </main>
    </div>
  );
}

// ============================================================================
// ENTITLEMENTS LIST
// ============================================================================

function EntitlementsList() {
  const [entitlements, setEntitlements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPolicy, setFilterPolicy] = useState<string>("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const result = await adminListEntitlements({
          headers: await authenticatedHeaders(),
          data: { limit: 100, offset: 0 },
        });
      if (active && result.success) setEntitlements(result.assignments ?? []);
      if (active) setLoading(false);
      } catch { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, []);

  const filteredEntitlements = entitlements.filter((e) => {
    const matchesSearch =
      searchTerm === "" ||
      e.user_id?.includes(searchTerm) ||
      e.organization_id?.includes(searchTerm);
    const matchesPolicy =
      filterPolicy === "" || e.policy_id?.policy_slug === filterPolicy;
    return matchesSearch && matchesPolicy;
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-50 mb-2">
              Search by User/Org ID
            </label>
            <input
              type="text"
              placeholder="Enter UUID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 placeholder-slate-500 dark:placeholder-slate-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-50 mb-2">
              Filter by Policy
            </label>
            <select
              value={filterPolicy}
              onChange={(e) => setFilterPolicy(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50"
            >
              <option value="">All policies</option>
              <option value="default-public">Standard Pricing</option>
              <option value="founders-account">Founder Account</option>
              <option value="partner-attorney">Partner Attorney</option>
              <option value="internal-admin">Internal Admin</option>
              <option value="legal-aid-org">Legal Aid Organization</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50">
                  Type
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50">
                  ID
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50">
                  Policy
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50">
                  Assigned
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50">
                  Expires
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">Loading entitlements…</td></tr>
              ) : filteredEntitlements.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-slate-500 dark:text-slate-400"
                  >
                    No entitlements found
                  </td>
                </tr>
              ) : (
                filteredEntitlements.map((e) => (
                  <tr
                    key={e.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-900 transition"
                  >
                    <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-50">
                      {e.user_id ? "User" : "Organization"}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 font-mono">
                      {e.user_id || e.organization_id}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-50">
                      <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 text-xs font-medium">
                        {e.policy_id?.display_name || "Unknown"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                      {new Date(e.assigned_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                      {e.expires_at
                        ? new Date(e.expires_at).toLocaleDateString()
                        : "Never"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button className="text-blue-600 dark:text-blue-400 hover:underline text-xs font-medium">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Info */}
      <div className="text-sm text-slate-600 dark:text-slate-400">
        Showing {filteredEntitlements.length} of {entitlements.length}{" "}
        entitlements
      </div>
    </div>
  );
}

// ============================================================================
// ASSIGN POLICY FORM
// ============================================================================

function AssignPolicyForm() {
  const [formData, setFormData] = useState({
    type: "user" as "user" | "organization",
    targetId: "",
    policyId: "",
    expiresAt: "",
    reason: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Call server function to assign entitlement
      const response = await adminAssignEntitlement({
        headers: await authenticatedHeaders(),
        data: { targetUserId:
          formData.type === "user" ? formData.targetId : undefined,
        targetOrgId:
          formData.type === "organization" ? formData.targetId : undefined,
        policyId: formData.policyId,
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : undefined,
        reason: formData.reason || undefined },
      });

      setResult(response);

      if (response.success) {
        // Reset form on success
        setFormData({
          type: "user",
          targetId: "",
          policyId: "",
          expiresAt: "",
          reason: "",
        });

        // Show success message
        setTimeout(() => setResult(null), 5000);
      }
    } catch (error) {
      setResult({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to assign entitlement",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit}>
        <div className="bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 p-8 space-y-6">
          {/* Type Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-50 mb-3">
              Assign to
            </label>
            <div className="flex gap-4">
              {(["user", "organization"] as const).map((type) => (
                <label key={type} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value={type}
                    checked={formData.type === type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value as any })
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-slate-900 dark:text-slate-50 capitalize">
                    {type}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Target ID */}
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-50 mb-2">
              {formData.type === "user" ? "User ID" : "Organization ID"}
            </label>
            <input
              type="text"
              placeholder="Enter UUID..."
              value={formData.targetId}
              onChange={(e) =>
                setFormData({ ...formData, targetId: e.target.value })
              }
              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 placeholder-slate-500 dark:placeholder-slate-400"
              required
            />
          </div>

          {/* Policy Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-50 mb-2">
              Policy
            </label>
            <select
              value={formData.policyId}
              onChange={(e) =>
                setFormData({ ...formData, policyId: e.target.value })
              }
              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50"
            >
              <option value="">Enter the policy UUID below</option>
            </select>
          </div>

          {/* Expiration Date */}
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-50 mb-2">
              Expiration Date (Optional)
            </label>
            <input
              type="datetime-local"
              value={formData.expiresAt}
              onChange={(e) =>
                setFormData({ ...formData, expiresAt: e.target.value })
              }
              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Leave blank for lifetime assignment
            </p>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-50 mb-2">
              Reason for Assignment
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) =>
                setFormData({ ...formData, reason: e.target.value })
              }
              placeholder="Why are you making this assignment?"
              rows={3}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 placeholder-slate-500 dark:placeholder-slate-400"
            />
          </div>

          {/* Submit Button */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg font-medium transition"
            >
              {submitting ? "Assigning..." : "Assign Policy"}
            </button>
          </div>
        </div>
      </form>

      {/* Result Message */}
      {result && (
        <div
          className={`p-4 rounded-lg border ${
            result.success
              ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-900 dark:text-green-50"
              : "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-900 dark:text-red-50"
          }`}
        >
          <p className="text-sm font-medium">
            {result.success ? "✓ " : "✗ "}
            {result.message || result.error}
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPONENTS
// ============================================================================

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-1 py-4 text-sm font-medium border-b-2 transition ${
        active
          ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
          : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50"
      }`}
    >
      {label}
    </button>
  );
}
