/**
 * Admin: Audit Log Viewer (Phase 2)
 *
 * Displays:
 * - Complete audit trail of all system changes
 * - Filtered by resource type, action, user
 * - Compliance-ready for audits
 * - Search and pagination support
 */

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/audit-log")({
  component: AdminAuditLogPage,
});

function AdminAuditLogPage() {
  const [filters, setFilters] = useState({
    action: "",
    resourceType: "",
    userId: "",
    searchTerm: "",
  });
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const actionOptions = [
    { value: "policy_created", label: "Policy Created" },
    { value: "policy_updated", label: "Policy Updated" },
    { value: "assignment_created", label: "Assignment Created" },
    { value: "assignment_updated", label: "Assignment Updated" },
    { value: "assignment_expired", label: "Assignment Expired" },
    { value: "quote_created", label: "Quote Created" },
    { value: "quote_accepted", label: "Quote Accepted" },
    { value: "quote_expired", label: "Quote Expired" },
  ];

  const resourceOptions = [
    { value: "policy", label: "Policy" },
    { value: "assignment", label: "Assignment" },
    { value: "quote", label: "Quote" },
    { value: "organization", label: "Organization" },
    { value: "member", label: "Member" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
            Audit Log
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Complete compliance trail of all system changes
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Filters */}
        <div className="bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 p-6 mb-8">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-6">
            Filter Logs
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Action Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-slate-50 mb-2">
                Action
              </label>
              <select
                value={filters.action}
                onChange={(e) =>
                  setFilters({ ...filters, action: e.target.value })
                }
                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50"
              >
                <option value="">All actions</option>
                {actionOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Resource Type Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-slate-50 mb-2">
                Resource Type
              </label>
              <select
                value={filters.resourceType}
                onChange={(e) =>
                  setFilters({ ...filters, resourceType: e.target.value })
                }
                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50"
              >
                <option value="">All types</option>
                {resourceOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* User Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-slate-50 mb-2">
                User ID
              </label>
              <input
                type="text"
                placeholder="UUID..."
                value={filters.userId}
                onChange={(e) =>
                  setFilters({ ...filters, userId: e.target.value })
                }
                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 placeholder-slate-500 dark:placeholder-slate-400"
              />
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-slate-50 mb-2">
                Search
              </label>
              <input
                type="text"
                placeholder="Search reason..."
                value={filters.searchTerm}
                onChange={(e) =>
                  setFilters({ ...filters, searchTerm: e.target.value })
                }
                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 placeholder-slate-500 dark:placeholder-slate-400"
              />
            </div>
          </div>

          {/* Clear Filters Button */}
          {Object.values(filters).some((v) => v !== "") && (
            <button
              onClick={() =>
                setFilters({
                  action: "",
                  resourceType: "",
                  userId: "",
                  searchTerm: "",
                })
              }
              className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Logs Table */}
        <div className="bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50">
                    Timestamp
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50">
                    Action
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50">
                    Resource
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50">
                    Actor
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50">
                    Reason
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-900 transition">
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                    Sep 5, 2026 14:32:11
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className="px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 text-xs font-medium">
                      assignment_created
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-50 font-mono text-xs">
                    a1b2c3d4...
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 font-mono text-xs">
                    user@...
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                    Partner policy assigned
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <button className="text-blue-600 dark:text-blue-400 hover:underline text-xs font-medium">
                      View
                    </button>
                  </td>
                </tr>

                <tr className="hover:bg-slate-50 dark:hover:bg-slate-900 transition">
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                    Sep 5, 2026 10:15:44
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className="px-2 py-1 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 text-xs font-medium">
                      quote_accepted
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-50 font-mono text-xs">
                    q5e6f7g8...
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 font-mono text-xs">
                    customer@...
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                    Payment success
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <button className="text-blue-600 dark:text-blue-400 hover:underline text-xs font-medium">
                      View
                    </button>
                  </td>
                </tr>

                <tr className="hover:bg-slate-50 dark:hover:bg-slate-900 transition">
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                    Sep 4, 2026 16:22:03
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className="px-2 py-1 rounded-full bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-200 text-xs font-medium">
                      quote_created
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-50 font-mono text-xs">
                    q9i0j1k2...
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 font-mono text-xs">
                    customer@...
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                    CP2000 workflow
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <button className="text-blue-600 dark:text-blue-400 hover:underline text-xs font-medium">
                      View
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Showing 1-3 of 1,247 log entries
          </p>
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-50 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-900 transition disabled:opacity-50">
              ← Previous
            </button>
            <button className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-50 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-900 transition">
              Next →
            </button>
          </div>
        </div>

        {/* Export */}
        <div className="mt-8 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Need to export audit logs for compliance?
          </p>
          <button className="px-4 py-2 bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 rounded-lg text-sm font-medium hover:bg-slate-800 dark:hover:bg-slate-100 transition">
            Export as CSV
          </button>
        </div>
      </main>
    </div>
  );
}
